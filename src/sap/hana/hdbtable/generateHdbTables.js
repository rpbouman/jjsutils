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
      
      var columnCallbacks = {
        beforeFirst: function(){
          var output = <<EOD
table.columns = [
EOD
          return output;
        },
        forEach: function(){
          var typeName = this.row.TYPE_NAME;
          var typeCode = this.row.DATA_TYPE;
          var typeInfo = "", comment = "";
          var hanaType = hanaJdbcTypes[String(typeCode)];
          if (hanaType) {
            if (hanaType.typeNames) {
              if (!hanaType.typeNames[typeName]) {
                comment = "\n  //Warning: no type " + typeName + " in HANA, but an alternative is available.";
                typeName = hanaType.preferredTypeName;
              }
              hanaType = hanaType.typeNames[typeName];
            }
            else
            if (hanaType.alternative) {
              comment = "\n  //Warning: no type " + typeName + " in HANA, but an alternative is available.";
              typeCode = hanaType.alternative.type;
              typeName = hanaType.alternative.name;
              hanaType = hanaJdbcTypes[typeCode];
              hanaType = hanaType.typeNames[typeName];
            }
          }
          
          if (hanaType) {
            if (hanaType.params) {
              if (hanaType.params.length) {
                typeInfo = "length = ${this.row.COLUMN_SIZE}";
              }
              else
              if (hanaType.params.precision && hanaType.params.scale) {
                typeInfo = "precision = ${this.row.COLUMN_SIZE}; scale = ${this.row.DECIMAL_DIGITS}";
              }
            }
          }
          else {
            comment = "\n  //Warning: no type mapping found for type " + this.row.TYPE_NAME + " (jdbc type: " + this.row.DATA_TYPE + ")";
          }
          
          if (typeInfo.length) {
            typeInfo += ";";
          }
          this.typeInfo = "sqlType = " + typeName + "; " + typeInfo;

          this.nullable = "nullable = " + (this.row.IS_NULLABLE === "NO" ? false : true );
          var label = (this.row.REMARKS === null || this.row.REMARKS.length === 0) ? hanaJdbcHelper.getFriendlyName(this.row.COLUMN_NAME) : this.row.REMARKS.replace(/"/g, "\\\"");
          this.comments = "comment = \"" + label + "\"";

          var output = <<EOD
${this.rowNum === 1 ? "" : ","}  ${comment}
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
          var file = this.file;
          if (file === null) {
            print(output);
            return;
          }
          else {
            var canonicalPath = file.getCanonicalPath();
            var verb = file.exists() ? "Overwriting existing" : "Writing new";
            print(verb + " file " + canonicalPath);

            var PrintStream = Java.type("java.io.PrintStream");
            var printStream = new PrintStream(file);
            printStream.print(output);
          }
        },
        forEach: function(){
          var directory = this.directory;
          if (!directory) {
            this.file = null;
          }
          else {
            var name = this.row.TABLE_NAME;
            var index = name.indexOf("::");
            if (index !== -1) {
              name = name.substring(index + 2);
            }
            name = name.toUpperCase() + ".hdbtable";
            this.file = new File(directory, name);
            var canonicalPath = this.file.getCanonicalPath();
            if (this.file.exists()) {
              if (args.get("overwrite") === false) {
                this.file = null;
                print("Skipping file " + canonicalPath + "; file exists and overwrite is false.");
                return;
              } 
              else
              if (file.isDirectory()) {
                print("Skipping file " + canonicalPath + "; cannot overwrite directory.");
                return;
              }
            }
          }
 
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