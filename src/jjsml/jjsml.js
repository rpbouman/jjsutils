/**
* A module loader for jjs, the javascript shell based on Nashorn that ships with Oracle JDK 1.8.
*
* The shell comes with built-in functions to load external scripts (and files).
* Unfortunately, it does not come with support for module and dependency loading.
* Also, dealing with relative paths is a challenge, since jjs resolves those
* with respect to the program working directory (that is, the dir from whence jjs was run).
*
* The jjsml module tries to provide a solution for these problems.
*
* The jjsml module exports a single global `define()` function 
* which can be used to define and load modules, and to load their dependencies.
* In addition, the jjsml module detects whether a main module was specified through the
* `jjsml.main.module` java System property.
* When specified, this module will be loaded automatically, acting as an entrypoint.
*
* @module jjsml
*/
(function(exports){
/**
* The global object.
*
* @class Global
* @static
*/
  //prevent overriding this script's assets.
  if (exports.define) {
    return;
  }
  
  var _builtinLoad = load;

  var File = Java.type("java.io.File");
  var separator = File.separator;
  
  function splitPath(path){
    //split by backslash and slash. 
    //we consider both as path element separator
    return path.split(/[\/\\]/g);
  }
  
  function getSystemProperty(name){
    var System = Java.type("java.lang.System");
    var value = System.getProperty(name);
    return value;
  }
   
  //current working directories.
  //we need this to allow relative paths when loading modules.
  var cwd = [];
  //this is where we keep our modules.
  //we use canonical path as key and the script object as returned by load() as value.
  var modules = {};  
  
  //function to get a module from the cache,
  //or else, load the module anew and store it in the cache.
  function getModule(module, plainLoad) {
    //split the module in script and path
    var dir = splitPath(module);
    var script = dir.pop();
    
    //obtain a file representing the module to load
    var file = new File(dir.join(separator), script);
    var isAbsolute = file.isAbsolute();
    var peek, mark1 = cwd.length, mark2;
    if (!isAbsolute) {
      //module path is relative, so prepend current dir
      peek = cwd[cwd.length - 1];
      var path = peek.concat(dir).join(separator);
      file = new File(path, script);
    }
    
    //get the canonical path so we can check if the module was already loaded.
    var canonicalPath = file.getCanonicalPath();
    var moduleObject = modules[canonicalPath];
    
    if (plainLoad === true || typeof(moduleObject) === "undefined"){  //module not yet loaded. 
      //Before loading the module we have to do some bookkeeping to the 
      //current working directory
      if (isAbsolute) { //absolute paths: need to put a new dir on the cwd stack
        //remember current size of cwd stack so we can restore after loading this module.
        mark = cwd.length;
        //make the module dir the new current working dir. 
        //Any relative paths loaded from this module will be resolved against this.
        cwd.push(dir);
        peek = dir;
      }
      else {  //relative path: need to update the current cwd.
        //remember size of current cwd stack entry so we can restore it after loading the module.
        mark2 = peek.length;
        //append the path elements of the new module to the current cwd entry.
        peek.push.apply(peek, dir);
      }
      
      //use the canonical path to load the module.
      //note that loading may (and probably will) result in many more requests to load modules.
      moduleObject = _builtinLoad(canonicalPath);

      if (isAbsolute) {
        cwd.length = mark1;
      }
      else {
        peek.length = mark2;
      }
      
      if (plainLoad !== true) {
        //check if the module was loaded succesfully
        var moduleType = typeof(moduleObject);
        if (moduleType === "undefined") {
          //Not sure yet what to do. If we throw an error, we can't use define for "normal", non-module script loading.
          //I think it would be cool to be able to use it for those cases too.
          //throw new Error("Cannot load module " + module + " (resolved as: " + canonicalPath + ").");
        } 
        else {
          //store the loaded module so we don't need to load it again.
          modules[canonicalPath] = moduleObject;
        }
      }      
    }
    
    //either the module was already loaded, or we just loaded it anew.
    return moduleObject;
  }
  
  function plainLoad(module){
    return getModule(module, true);
  }

  /**
  * Defines a module. 
  *
  * The `define()` function is available globally. 
  * It allows you to cleanly define and expose functionality using the javascript module pattern.
  
  * The last argument passed to `define()` should be a callback function that actually defines the module.
  * Typically the callback returns a value (usually of the object or function type) that provides access to the functionality of the module.
  * For example, a module could expose a constructor, or a factory function.
  * Alternatively, a module could return a singleton object or a constant value.
  * Finally, the callback could also expose its own global properties and/or functions.
  *
  * `define()` lets you load and manage any dependencies your module might have.
  * Any dependencies can be passed as string arguments prior to the final callback argument.
  *
  * Dependency argument are considered paths to javascript files that themselves typically define other modules.
  * Relative paths are resolved against the location of the current module.
  *
  * Dependencies loaded with `define()` are loaded only once.
  * Subsequent requests for a module loaded prior are served from a module cache.
  *
  * Example module in file module3.js
  *
  *     (function(){
  *
  *       //use the define() method to define module1 and module2 as dependencies
  *       //and to create and expose a new module 
  *       define(
  *         "tmp/module1.js", "../scripts/module2.js",  //dependencies
  *         function(module1, module2){                 //callback creates the actual module.
  *           //this callback is called after module1 and module2 are loaded
  *           //the callback is passed those dependencies as arguments so it can use them.
  *           return {
  *             ...define the actual module functionlity here...
  *           };
  *         }
  *       );
  *     })()  //in this example, "this" passed to the module is thought to be the Global object.
  *
  * 
  *
  * @method define
  * @param [...dependency] {string} Modules upon which this module is dependent.
  * @param module The module being defined. This should typically be a function, but it may also be a object, or a string identifying a script. 
  * @return {Object}
  */
  function define(){
    var i, n = arguments.length - 1, dependency, dependencyModule, dependencyModules = [];
    for (i = 0; i < n; i++) {
      dependency = arguments[i];
      dependencyModule = getModule(dependency);
      dependencyModules.push(dependencyModule);
    }
    
    var callback = arguments[n], typeOfCallback = typeof(callback), ret;
    switch (typeOfCallback) {
      case "string":
        var plainLoad = (n === 1);
        dependencyModule = getModule(callback, plainLoad);
        break;
      case "function":
        dependencyModule = callback.apply(this, dependencyModules);
        break;
      case "object":
        dependencyModule = callback;
        break;
      default:
        throw new Error("Last argument to define() must be either a path to load a module, or a function that returns the public interface to a module. Found: " + typeOfCallback);
        break;
    }
    
    return dependencyModule;
  }
  
  //make define() accesible in the global object
  exports.define = define;
  
  //override the built-in load
  //exports.load = plainLoad;
  
  var mainModule = getSystemProperty("jjsml.main.module");
  if (mainModule === null || typeof(mainModule) === "undefined") {
    throw new Error("Cannot load main module: System property jjsml.main.module is undefined. Pass the main module script as -Djjsml.main.module=<your main module script>");
  }
  
  //split the module in script and path
  var dir = splitPath(mainModule);
  var script = dir.pop();
  
  //obtain a file representing the module to load
  var file = new File(dir.join(separator), script);
  var isAbsolute = file.isAbsolute();
  if (!isAbsolute) {
    //relative: prepend the program working directory
    var pwd = $ENV.PWD;
    pwd = splitPath(pwd);
    dir = pwd.concat(dir);
  }
  //establis initial current working directoruy
  cwd.push(dir);
  
  //load the main module.
  var module = getModule(script);
  if (typeof(module) === "function") {
    module();
  }
  
})(this);