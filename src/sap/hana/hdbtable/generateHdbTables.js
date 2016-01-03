(function(exports){
  File = Java.type("java.io.File");
  System = Java.type("java.lang.System");
  
  return define(
    "../../../args/Args.js", 
    "../../../jdbc/createTableIterator.js",     
    function(args, createTableIterator){
      var sapJdbcJar = "";
      var os = System.getProperty("os.name").toLowerCase();
      if (os.indexOf("win") !== -1) {
        sapJdbcJar = "C:\\Program Files\\sap\\hdbclient\\";
      }
      else 
      if (
        (os.indexOf("nux") !== -1) || 
        (os.indexOf("aix") !== -1) || 
        (os.indexOf("nix") !== -1) 
      ){
        sapJdbcJar = "/usr/sap/hdbclient/";
      }
      sapJdbcJar += "ngdbc.jar";
      
      args.define({
        name: "driver",
        help: "Fully qualified class name of the JDBC Driver.",
        value: "com.sap.db.jdbc.Driver",
        mandatory: true
      }, {
        name: "jar",
        help: "Location of the .jar file containing the JDBC driver.",
        value: sapJdbcJar
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
      
      var columnCallbacks = {
        beforeFirst: function(){
          var output = <<EOD
table.columns = [
EOD
          return output;
        },
        forEach: function(){
          var typeName = this.row.TYPE_NAME;
          var typeInfo;
          switch (typeName){
            case "DECIMAL":
            case "SMALLDECIMAL":
              typeInfo = "precision = ${this.row.COLUMN_SIZE}; scale = ${this.row.DECIMAL_DIGITS}";
              break;
            case "VARCHAR":
            case "NVARCHAR":
            case "CHAR":
            case "NCHAR":
              typeInfo = "length = ${this.row.COLUMN_SIZE}";
              break;
            default:
              typeInfo = "";
              break;
          }
          if (typeInfo.length) {
            typeInfo += ";";
          }
          this.typeInfo = "sqlType = " + typeName + "; " + typeInfo;

          this.nullable = "nullable = " + (this.row.IS_NULLABLE === "NO" ? false : true );
          this.comments = "comment = \"" + (this.row.REMARKS === null ? "" : this.row.REMARKS.replace(/"/g, "\\\"")) + "\"";

          var output = <<EOD
${this.rowNum === 1 ? "" : ","}  
  { name = "${this.row.COLUMN_NAME}"; ${this.typeInfo} ${this.nullable}; ${this.comments}; }
EOD
          return output;
        },
        afterLast: function(){
          var output = <<EOD

];
EOD
          return output;
        }
      };

      var primaryKeyCallbacks = {
        beforeFirst: function(){
          var output = <<EOD
table.primaryKey.pkcolumns = [
EOD
          return output;
        },
        forEach: function(){
          var output = <<EOD
${this.rowNum === 1 ? "" : ", "}"${this.row.COLUMN_NAME}"
EOD          
          return output;
        },
        afterLast: function(){
          var output = <<EOD
];
EOD
          return output;
        }
      };
      
      var indexCallbacks = {
        beforeFirst: function(){
          var output = <<EOD
table.indexes = [
EOD
          return output;
        },
        forEach: function(){
          var output = "";
          if (this.row.ORDINAL_POSITION === 1) {
            if (this.rowNum !== 1) {
              output += "]; },";
            }
            output += <<EOD

  { name = "${this.row.INDEX_NAME}"; unique = ${!this.row.NON_UNIQUE}; order = ${this.row.ASC_OR_DESC}SC; indexColumns = [
      EOD
          }
          else {
            output += ", ";
          }
          output += '"' + this.row.COLUMN_NAME + '"';
          return output;
        },
        afterLast: function(){
          var output = <<EOD
]; }
];          
EOD          
          return output;
        }        
      };
      
      var tableIterator = createTableIterator({
        driver: args.get("driver"),
        jar: args.get("jar"),
        url: args.get("url"),
        user: args.get("user"),
        password: args.get("password")
      }, {
        catalog: args.get("catalog"),
        schemaPattern: args.get("schema"),
        tablePattern: args.get("tables"),
        tableTypes: "TABLE",
      }, {
        beforeFirst: function(){
          var directory = args.get("directory");
          if (!directory.isDirectory() || !directory.exists()){
            directory = null;
          }
          this.directory = directory;
        },
        handleOutput: function(output){
          var directory = this.directory;
          if (!directory) {
            print(output);
            return;
          }
          
          var name = this.row.TABLE_NAME;
          var index = name.indexOf("::");
          if (index !== -1) {
            name = name.substring(index + 2);
          }
          name = name.toUpperCase() + ".hdbtable";
          file = new File(directory, name);
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
        },
        forEach: function(){
          var schemaName = (this.row.TABLE_SCHEM || this.row.TABLE_CAT).toUpperCase();
          var output = <<EOD

// HDBTable definition reverse engineered from JDBC metadata. 
// URL: ${args.get("url")} 
// Source Catalog: "${this.row.TABLE_CAT}"
// Source Schema: "${this.row.TABLE_SCHEM}"
// Source Table: "${this.row.TABLE_NAME}"
// Generated by: ${Java.type("java.lang.System").getProperty("user.name")} (JDBC: ${args.get("user")})
// Generation date: ${new Date()}

table.schemaName = "${schemaName}";
table.temporary = false;
table.tableType = COLUMNSTORE;
table.loggingType = LOGGING;
table.public = true;
table.description = "${this.row.REMARKS}";

${this.iterateColumns(columnCallbacks)}

${this.iteratePrimaryKeyColumns(primaryKeyCallbacks)}

${this.iterateIndexColumns(indexCallbacks)}
          
EOD          
          this.handleOutput(output);
          return output;
        }
      });
      return tableIterator.iterate();
    }
  );
  
})(this);