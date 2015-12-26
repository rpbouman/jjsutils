(function(exports){
  var argDefs = {};

  function defineMultipleArgs(array){
    var n = array.length, i;
    for (i = 0; i < n; i++) {
      defineArg(array[i]);
    }
  }
  
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
  
  function setArgValue(name, value, userSpecified){
    var argDef = getArgDef(name);
    if (argDef.parse) {
      value = argDef.parse.call(argDef, value);
    }
    argDef.value = value;
    argDef.userSpecified = Boolean(userSpecified);
  }
  
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