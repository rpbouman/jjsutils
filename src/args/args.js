/**
*
* Commandline arguments for jjs. jjs accepts user arguments after the -- on its commandline.
* This module provides functionality to define, document, parse, and prompt for jjs arguments
* specified as &lt;name&gt;=&lt;value&gt; pairs.
*
* Typically you would acquire this module by naming it as a dependency to a call to `define()` when defining a user module.
* The object passed to the `define()` callback to represent the dependency can be treated as a singleton `Args` class,
* which exposes all functonality to work with arguments as static methods.
*
* @module Args
*/
(function(exports){
/**
* For example, suppose you want to create a jjs command line utility that can accept 
* arguments arg1 and arg2, then you could use the Args module like this:
*
*     (function(){
*         define("../../src/args/Args.js", function(args){
*         
*           //1) use args.define() to pass one or more argDef objects
*           args.define({     
*             name: "arg1",                                         //name property is used for name in a &lt;name&gt;=&lt;value&gt; pair
*             help: "This is arg1 for this command line utility."   //help is used to provide users with a clue on what value to enter
*             value: "Hello"                                        //value may be used to specify a default value
*             parse: function(value){                               //parse() may be specified to validate and convert value 
*               ...code to convert string value from default value or passed on the command line to appropriate internal argument value 
*             }
*           }, {
*             name: "arg2",
*             help: "This is arg2 for this command line utility.",
*             mandatory: true                                       //mandatory stipulates that this argument is mandatory
*           });
*
*           //2) use args.init() to parse and validate arguments passed on the command line.
*           args.init();
*
*           //3) if necessary use args.show() to print all arguments along with their help text
*           //(in this case: "necessary" is when no arguments where specified)
*           if ($ARG.length === 0){
*             args.show();
*             exit();
*           }
*
*           //4) for those mandatory arguments that do not have received a value, prompt the user.
*           args.prompt();
*
*           //5) use args.get(&lt;name&gt;) to get the value of an argument and use it in your script.
*           var arg1 = args.get("arg1");
*           print(arg1);
*
*           var arg2 = args.get("arg2");
*           print(arg2);
*         });
*     })()
*
*  Suppose this would be in `examples/exampleX/myScript.js`. Then running it as follows:
*
*    $ jjs -scripting -Djjsml.main.module=myScript.js ../../src/jjsml/jjsml.js -- arg2=World!
*    Hello
*    World!
*  
*  So, `arg1` takes on the default value, and `arg2` the value `"World!"`, which was passed at the command line.
*
*  If no arguments would be passed on the command line, the output would be:
*
*    $ jjs -scripting -Djjsml.main.module=myScript.js ../../src/jjsml/jjsml.js
*    arg1 This is arg1 for this command line utility. (Hello)
*    arg2 This is arg2 for this command line utility. (undefined)
*
*  The output shown comes from the call to the `show()` function which shows all defined arguments
*  and their current value.
*
*  If we would pass an argument for `arg1`, but not for the mandatory argument `arg2`, we'd be prompted:
*
*  $ jjs -scripting -Djjsml.main.module=myScript.js ../../src/jjsml/jjsml.js -- arg1=Goodbye
*  arg2? args
*  Goodbye
*  args
*
*  Note: in the output above, the `arg2?` is the program prompting the user; 
*  `args` is the value entered by the user in response to the prompt.
*  The next two lines is the program output caused by the invokating of `print()` on the argument values. 
*
* @class Args
* @static
*/  
  var argDefs = {};

  function defineMultipleArgs(array){
    var n = array.length, i;
    for (i = 0; i < n; i++) {
      defineArg(array[i]);
    }
  }
  
  /**
  * Defines a command line argument.
  *
  * @method define
  * @static
  * @param [argDef] {Object} argument definition object.
  */
  function defineArg(argDef) {
    switch (arguments.length){
      case 0:
        throw new Error("No argument to define.");
        break;
      case 1:
        if (arguments[0].constructor === Array) {
          defineMultipleArgs(argDef);
        }
        else {
          var name = argDef.name;
          
          if (typeof(argDefs[name]) === "undefined") {
            argDefs[name] = argDef;
          }
          else {
            throw new Error("Argument " + name + " already defined.");
          }
        }
        break;
      default:
        defineMultipleArgs(arguments);
    }
  }
  
  function getArgDef(name){
    var argDef = argDefs[name];
    if (typeof(argDefs[name]) === "undefined") {
      throw new Error("No such argument " + name + ".");
    }
    return argDef;
  }
  
  /**
  * Set the value of a defined argument.
  * This can be useful in case you have some custom program logic 
  * that knows how to set a default value for an existing command line argument.
  *
  * If the argDef identified by the `name` param defines a `parse()` method, then 
  * that method will be called and passed the value, and the return value of the 
  * `parse()` method will be assigned as the argument's actual value.
  *
  * @method set
  * @static
  * @param name Name of the argument to which the value will be assigned.
  * @param value Value that will be assigned to the argument.
  */
  function setArgValue(name, value, userSpecified){
    var argDef = getArgDef(name);
    if (argDef.parse) {
      value = argDef.parse.call(argDef, value);
    }
    argDef.value = value;
    argDef.userSpecified = Boolean(userSpecified);
  }
  
  /**
  * Gets the value of the specified, previously defined and initialzed command line argument. 
  * Note that for typical usages, `init()` should be called (once) prior to any calls to `get()`
  *
  * @method get
  * @static
  * @param name {string} name of the argument.
  * @return Returns the value of the specified command line argument.
  */
  function getArgValue(name){
    var argDef = getArgDef(name);
    return argDef.value;
  }
  
  function printArgs(){
    var name, argDef, array = [];
    for (name in argDefs) {
      argDef = argDefs[name];
      print(name + ": " + argDef.help + (argDef.value ? " (" + arg.value + ")": ""));
    }
  }
  
  function showArgDef(argDef, pad){
    var string = Java.type("java.lang.String");
    var format = "%1$";
    if (pad) {
      format += "-" + pad;
    }
    format += "s %2$s (%3$s)"
    print(string.format(format, argDef.name, argDef.help, argDef.value));
  }
  
  /**
  * prints the arguments, along with their help text and their current value.
  * Useful as a "usage" help message 
  *
  * @method show
  * @static
  */
  function showArgDefs(name){
    var argDef;
    if (name) {
      argDef = getArgDef(name);
      showArgDef(argDef, pad);
    }
    else {
      var name, names = [], pad = 0;
      for (name in argDefs) {
        if (name.length > pad) {
          pad = name.length;
        }
        names.push(name);
      }
      
      names.sort();
      var i, n = names.length;
      for (i = 0; i < n; i++) {
        name = names[i];
        argDef = getArgDef(name);
        showArgDef(argDef, pad);
      }
    }
  }
  
  /**
  * Parses the actual command line arguments and matches them to the defined `argDef` objects to set their value.
  * Also, sets the default values for those arguments that were not specified on the command line but have a default value.
  *
  * @method init
  * @static
  */
  function initArgs(){
    //first, assign values passed at the command line.
    var i, n = $ARG.length, arg, argDef, name, value;
    for (i = 0; i < n; i++) {
      arg = $ARG[i].split("=");
      name = arg.shift();
      value = arg.join("=");
      setArgValue(name, value, true);
    }
    
    //then, assign default values in case not specified on the command line.
    for (name in argDefs){
      argDef = argDefs[name];
      if (!argDef.userSpecified && argDef.value) {
        setArgValue(name, argDef.value, false);
      }
    }
  }
 
  /**
  * Prompt the user for any mandatory arguments that do not yet have a value.
  * Note that `init()` should have been called (once) prior to the call to `prompt()`  
  *
  * @method prompt
  * @static
  */
  function promptMissingArgs(test){
    var name, argDef;
    
    if (!test) {
      test = function(argDef) {
        return (
          (argDef.mandatory === true) &&  
          (typeof(argDef.value) === "undefined")
        );
      }
    }
    
    for (name in argDefs) {
      argDef = argDefs[name];
      if (!test(argDef)) {
        continue;
      }
      while (true) {
        var input = readLine(argDef.name + "? ");
        try {
          setArgValue(name, input);
          break;
        }
        catch (e){
          print(e.getMessage());
        }
      }
    }
  }
 
  return define(function(){
    var obj = {
      define: defineArg,
      get: getArgValue,
      set: setArgValue,
      init: initArgs,
      prompt: promptMissingArgs,
      show: showArgDefs
    };
    return obj;
  });

})(this);