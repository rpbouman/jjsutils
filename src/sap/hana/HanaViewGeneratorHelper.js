(function(){

  File = Java.type("java.io.File");
  System = Java.type("java.lang.System");

  function escapeXml(str){
    if (!str) {
      return "";
    }
    str = String(str);
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/>/g, "&gt;");
    str = str.replace(/'/g, "&apos;");
    str = str.replace(/"/g, "&quot;");
    return str;
  }
  
  function getFriendlyName(str){
    var nameParts = str.split("_"), n = nameParts.length, namePart, i;
    for (i = 0; i < n; i++) {
      namePart = nameParts[i];
      namePart = namePart.charAt(0).toUpperCase() + namePart.substr(1).toLowerCase();
      nameParts[i] = namePart;
    }
    var friendlyName = nameParts.join(" ");        
    return friendlyName;
  }
  
  function getBareTableName(tableName){
    var indexOfColonColon = tableName.indexOf("::");
    if (indexOfColonColon === -1) {
      return tableName;
    }
    tableName = tableName.substr(indexOfColonColon + 2);
    return tableName;
  }
    
  return define(
    "../../args/Args.js", 
    function(args){

      function defineArgs() {
        args.define({
          name: "viewprefix",
          help: "A prefix for your view",
          value: "" 
        }, {
          name: "viewpostfix",
          help: "A postfix for your view",
          value: "_001" 
        }, {
          name: "tableprefix",
          help: "A regular expression to identify the prefix of the tables"
        }, {
          name: "tablepostfix",
          help: "A regular expression to identify the postfix of the tables",
          value: "" 
        }, {
          name: "hanaschema",
          help: "HANA schema to load objects from.",
          mandatory: true
        }, {
          name: "tables",
          help: "tables to load.",
          value: "%"
        }, {
          name: "overwrite",
          help: "Whether to overwrite existing files.",
          value: "false",
          parse: function(value){
            var values = {
              "true": true,
              "1": true,
              "on": true,
              "yes": true,
              "y": true,
              "false": false,
              "0": false,
              "off": false,
              "no": false,
              "n": false
            };
            value = values[value.toLowerCase()];
            return Boolean(value);
          }
        }, {
          name: "outputdir",
          help: "Where to save the output files.",
          value: System.getProperty("user.home"),
          parse: function(value){
            var file = new File(value);
            if (!file.isDirectory() || !file.exists()) {
              throw new Error("Value for directory must be an existing directory.");
            }
            return file;
          }
        });        
      }
      
      function handleOutput(output, fileName){
        var directory = args.get("outputdir");
        if (!directory.isDirectory() || !directory.exists()){
          print(output);
          return;
        }
        
        file = new File(directory, fileName);
        var canonicalPath = file.getCanonicalPath();
        if (file.exists()) {
          if (args.get("overwrite") === false) {
            file = null;
            print("Skipping file " + canonicalPath + "; file exists and overwrite is false.");
          } 
          else
          if (file.isDirectory()) {
            print("Skipping file " + canonicalPath + "; cannot overwrite directory.");
          }
        }
        if (file !== null) {
          var verb = file.exists() ? "Overwriting existing" : "Writing new";
          print(verb + " file " + canonicalPath);
          
          var PrintStream = Java.type("java.io.PrintStream");
          var printStream = new PrintStream(file);
          printStream.print(output);
        }
      }

      function getObjectName(tableName){
        var prefix = args.get("tableprefix");
        var postfix = args.get("tablepostfix");
        tableName = getBareTableName(tableName);
        var regex = new RegExp("^" + prefix + "(.+)" + postfix + "$", "ig");
        var match = regex.exec(tableName);
        if (!match) {
          return tableName;
        }
        var index = 1;
        var prefixSansGroups = prefix.replace(/[^\\]\(/g, "");

        index += prefix.length - prefixSansGroups.length
        return match[index];
      }

      function getViewName(tableName){
        var objectName = getObjectName(tableName);
        var prefix = args.get("viewprefix");
        var postfix = args.get("viewpostfix");
        var attributeViewName = prefix + objectName + postfix;
        return attributeViewName;
      }

      function initArgs(){
        args.init();
        if ($ARG.length === 0){
          args.show();
          exit();
        }
        args.prompt();        
      }
     
      function getTablesFilter(){
        var tablesFilter = {
          catalog: null,
          schemaPattern: args.get("hanaschema"),
          tablePattern: args.get("tables"),
          tableTypes: "TABLE",
        };
        return tablesFilter;
      }
      
      return {
        defineArgs: defineArgs,
        initArgs: initArgs,
        getTablesFilter: getTablesFilter,
        escapeXml: escapeXml,
        getFriendlyName: getFriendlyName,
        getBareTableName: getBareTableName,
        getObjectName: getObjectName,
        getViewName: getViewName,
        handleOutput: handleOutput
      };
    }
  );
})();