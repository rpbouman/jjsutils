(function(exports){
  
  return define(
    "../args/Args.js", 
    "createTableIterator.js",     
    function(args, createTableIterator){
      args.define({
        name: "driver",
        help: "Fully qualified class name of the JDBC Driver.",
        mandatory: true
      }, {
        name: "jar",
        help: "Location of the .jar file containing the JDBC driver.",
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
      });

      args.init();
      if ($ARG.length === 0){
        args.show();
        exit();
      }
      args.prompt();
      
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
        beforeAll: function(){
          print("TableIterator: beforeAll.");
          print("-------------------------");
          print("TableIterator properties: ");
          var p;
          for (p in  this) {
            print(p + ": " + typeof(this[p]));
          }
          print("");
        },
        beforeFirst: function(){
          print("TableIterator: beforeFirst.");
          print("---------------------------");
        },
        forEach: function(){
          print("=============================================================");
          print("TableIterator: forEach. Current Table: " + this.row.TABLE_NAME);
          print("");
          
          print("Columns:");
          print("--------");
          this.iterateColumns({
            forEach: function(){
              print("TableIterator.iterateColumns: " + this.row.COLUMN_NAME);
            }
          });
          print("");

          print("Primary Key Columns:");
          print("--------------------");
          this.iteratePrimaryKeyColumns({
            forEach: function(){
              print("iteratePrimaryKeyColumns: " + this.row.COLUMN_NAME);
            }
          });
          print("");

          print("Imported Key Columns:");
          print("---------------------");
          this.iterateImportedKeyColumns({
            forEach: function(){
              print("iterateForeignKeyColumns: " + this.row.FKCOLUMN_NAME);
            }
          });
          print("");
          
        },
        afterLast: function(){
          print("TableIterator: afterLast.");
        },
        afterAll: function(){
          print("TableIterator: afterAll.");
        },
        ifNone: function(){
          print("TableIterator: ifNone.");
        }
      });
      return tableIterator.iterate();
    }
  );
  
})(this);