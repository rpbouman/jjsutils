(function(exports){
  File = Java.type("java.io.File");
  System = Java.type("java.lang.System");
  JavaSqlTypes = Java.type("java.sql.Types")
    
  return define(
    "../../../args/Args.js", 
    "../HanaJdbcHelper.js", 
    "../../../jdbc/createTableIterator.js",     
    function(args, hanaJdbcHelper, createTableIterator){
            
      args.define({
        name: "driver",
        help: "Fully qualified class name of the JDBC Driver.",
        value: hanaJdbcHelper.getSapJdbcDriverClassName(),
        mandatory: true
      }, {
        name: "jar",
        help: "Location of the .jar file containing the JDBC driver.",
        value: hanaJdbcHelper.getLocationOfSapJdbcJar()
      }, {
        name: "url",
        help: "URL to establish JDBC connection.",
        mandatory: true
      }, {
        name: "user",
        help: "User to establish JDBC connection.",
        mandatory: true        
      }, {
        name: "password",
        help: "Password to establish JDBC connection.",
        mandatory: true
      }, {
        name: "catalog",
        help: "Catalog to load objects from.",
        value: null
      }, {
        name: "schema",
        help: "schema to load objects from.",
        value: null
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
          value = Boolean(value);
          return value;
        }
      }, {
        name: "directory",
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

      args.init();
      if ($ARG.length === 0){
        args.show();
        exit();
      }
      args.prompt();
      
      var hanaJdbcTypes = hanaJdbcHelper.getHanaJdbcTypes();

      var directory = args.get("directory");
      var path = directory.getCanonicalPath();
      var empty = "__empty__" + File.separator;
      path = path.substring(path.lastIndexOf(empty) + empty.length));
      var packageName = path.replace(File.separator, ".");
      
      var connection = jdbc.openConnection({
        jar: args.get("jar"),
        driver: args.get("driver"),
        url: args.get("url"),
        user: args.get("user"),
        password: args.get("password")
      });
      var metadata = connection.getMetaData();
    }
  );
  
})(this);