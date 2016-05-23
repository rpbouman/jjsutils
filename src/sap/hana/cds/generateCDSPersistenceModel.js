(function(){

  File = Java.type("java.io.File");
  PrintStream = Java.type("java.io.PrintStream");
  System = Java.type("java.lang.System");
  
  return define(
    "../../../args/Args.js", 
    "../HanaJdbcHelper.js",
    "../../../jdbc/iterateResultset.js", 
    function(args, hanaJdbcHelper, iterateResultset){
    
      function initArgs(){
        args.init();
        if ($ARG.length === 0){
          args.show();
          exit();
        }
        args.prompt();        
      }
      
      function checkWriteFile(file){
        if (!datadir.isDirectory()) {
          return false;
        }
        var write = true;
        if (file.exists()) {
          if (overwrite) {
            verb = "Overwriting existing";
          }
          else {
            verb = "Skipping existing non-overwriteable";
            write = false;
          }
        }
        else {
          verb = "Creating new";            
        }
        print(<<EOD

${verb} file ${file.getCanonicalPath()}
EOD);
        return write;        
      }

      hanaJdbcHelper.defineArgs();
      args.define({
        name: "projectdir",
        help: "Location of the HANA Studio project dir. Will be used to generate package name and to store output files.",
        value: System.getProperty("user.home"),
        parse: function(value){
          return new File(value);
        }
      }, {
        name: "tables",
        help: "tables to load.",
        value: "%"
      }, {
        name: "datadir",
        help: "Subdirectory of projectdir where the CDS files will be stored.",
        value: "data",
        parse: function(value){
          var datadir = new File(args.get("projectdir"), value);
          return datadir;
        }
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
        name: "hanaschema",
        help: "HANA schema to load objects from.",
        mandatory: true
      });
      initArgs();
      
      var connection = hanaJdbcHelper.getConnection();
      var metadata = connection.getMetaData();
      var schemas = metadata.getSchemas(null, args.get("hanaschema"));

      var projectdir = args.get("projectdir");
      var overwrite = args.get("overwrite");
      
      var datadir = args.get("datadir");
      if (!datadir.isDirectory()) {
        print(<<EOD

Datadir ${datadir.getCanonicalPath()} does not exist or is not a directory. No files will be written.
EOD
        );
      }
            
      var path = datadir.getCanonicalPath();
      path = path.split("__empty__");
      print(path[path.length-1]);
      var packageName = path[path.length - 1];
      packageName = packageName.split(/[\\\/]/);
      packageName.shift();
      packageName = packageName.join("\".\"");
      var packageName = <<EOD
"${packageName}"
EOD

      iterateResultset(schemas, {
        forEach: function(){
          var schemaName = this.row.TABLE_SCHEM;
          var schemaFile = new File(datadir, schemaName + ".hdbschema");
          var output, write = checkWriteFile(schemaFile);
          
          output = <<EOD
schema_name = "${schemaName}";            
EOD
          if (write === true) {
            var printStream = new PrintStream(schemaFile);
            printStream.print(output);
            printStream.close();
          }
          else {
            print(output);
          }
          
          var hdbddPrintStream = null;

          //https://help.sap.com/saphelp_hanaplatform/helpdata/en/e8/c150fde4614804831c63a67224ffa8/content.htm?frameset=/en/cf/394efd3fb4400f9c09d10315028515/frameset.htm&current_toc=/en/94/1793ceada44f329aa051e01d9222ff/plain.htm&node_id=25&show_children=true#jump25
          function getCdsDataType(typeName, columnSize, decimals){
            var hanaTypes = {
              "NVARCHAR": "String(${columnSize})",
              "NCLOB": "LargeString",
              "VARBINARY": "Binary(${columnSize})",
              "BLOB": "LargeBinary",
              "INTEGER": "Integer",
              "BIGINT": "Integer64",
              "DECIMAL": "Decimal(${columnSize}, ${decimals})",
              //"DECIMAL": "DecimalFloat",
              "DOUBLE": "BinaryFloat",
              "DATE": "LocalDate",
              "TIME": "LocalTime",
              "SECONDDATE": "UTCDateTime",
              "TIMESTAMP": "UTCTimestamp",
              "ALPHANUM": "hana.ALPHANUM(${columnSize})",
              "SMALLINT": "hana.SMALLINT",
              "TINYINT": "hana.TINYINT",
              "REAL": "hana.REAL",
              "SMALLDECIMAL": "hana.SMALLDECIMAL",
              "VARCHAR": "hana.VARCHAR(${columnSize})",
              "CLOB": "hana.CLOB(${columnSize})",
              "BINARY": "hana.BINARY(${columnSize})",
              "BOOLEAN": "hana.BOOLEAN",
              "ST_POINT": "hana.ST_POINT",
              "ST_GEOMETRY": "hana.ST_GEOMETRY",
              "TEXT": "LargeString"
            }
            return hanaTypes[typeName]
          }
          
          output = <<EOD

/**
*
* CDS persistence model reverse engineered from JDBC metadata. 
* Host: ${args.get("hanahost")} 
* Instance: ${args.get("hanainstance")} 
* Source Schema: "${this.row.TABLE_SCHEM}"
* Generated by: ${Java.type("java.lang.System").getProperty("user.name")} (JDBC: ${args.get("hanauser")})
* Generation date: ${new Date()}
*
*/
namespace ${packageName};          

@Schema : '${schemaName}'
context ${schemaName} {
EOD
          
          var hdbddFile = new File(datadir, schemaName + ".hdbdd"), hdbddPrintStream;
          write = checkWriteFile(hdbddFile);
          if (write) {
            hdbddPrintStream = new PrintStream(hdbddFile);
          } else {
            hdbddPrintStream = null;
          }

          var tables, columns, types = {}, _columnTypes = {}, _columnType;

          columns = metadata.getColumns(null, schemaName, args.get("tables"), "%");

          function getColumnTypeKey(row){
            return JSON.stringify([row.COLUMN_NAME, row.TYPE_NAME, row.COLUMN_SIZE, row.DECIMAL_DIGITS]);
          }
  
          function getColumnTypeName(columnName){
            return "t_${columnName.toLowerCase()}";
          }
          
          function getColumnTypeDef(columnName, typeName, columnSize, decimals){
            return <<EOD

    type ${getColumnTypeName(columnName)}: ${getCdsDataType(typeName, columnSize, decimals)};
EOD                        
          }
          
          function parseTableName(tableName){
            var parts, numParts, name = {};
            parts = tableName.split("::");
            numParts = parts.length;
            switch (numParts) {
              case 2:
                name.packageName = parts[0];
              case 1:
                name.fullName = parts[numParts - 1];
                break;
              default:
                throw new Error("Tablename has " + numParts + " parts.");
            }
            parts = name.fullName.split(".");
            var entityName = parts.pop();
            name.entityName = entityName;
            name.contexts = parts;
            return name;
          }

          output += <<EOD


    /**
    *
    * Recurring types: types used by multiple 
    * columns having the same name and data type.
    *
    */    
EOD          
          iterateResultset(columns, {
            forEach: function(){
              _columnType = getColumnTypeKey(this.row);
              if (_columnTypes[_columnType]) {
                _columnTypes[_columnType]++;
              }
              else {
                _columnTypes[_columnType] = 1;
              }
            }
          });
          
          for (_columnType in _columnTypes) {
            if (_columnTypes[_columnType] === 1) {
              continue;
            }
            _columnType = JSON.parse(_columnType);
            output += getColumnTypeDef.apply(null, _columnType);
          }
          
          tables = metadata.getTables(null, schemaName, args.get("tables"), ["TABLE"]);
          var proc;
          iterateResultset(tables, {
            forEach: function(){
              var row = this.row;
              var parsedTableName = parseTableName(row.TABLE_NAME);
              var proc = "";

              var pkColumns = {};
              var pkColumnCount = 0;
              var pks = metadata.getPrimaryKeys(row.TABLE_CAT, row.TABLE_SCHEM, row.TABLE_NAME);
              iterateResultset(pks, {
                forEach: function(){
                  pkColumns[this.row.COLUMN_NAME] = this.row;
                  pkColumnCount++;
                }
              });
              
              var indexes = metadata.getIndexInfo(
                row.TABLE_CAT, row.TABLE_SCHEM,
                row.TABLE_NAME, false, true
              );
              var indexDefs = iterateResultset(indexes, {
                beforeFirst: function(){
                  var output = <<EOD
                  
    @Catalog.index: [
EOD
                  return output;
                },
                forEach: function(){
                  var row = this.row, ordinal = row.ORDINAL_POSITION, output = "";
                  if (ordinal === 1) {
                    var ascOrDesc = row.ASC_OR_DESC === "A" ? "ASC" : "DESC";
                    if (!this.first) {
                      this.first = true;
                    }
                    else {
                      output += <<EOD
]}                      
EOD                      
                    }
                    output += <<EOD

      { name: '${row.INDEX_NAME}', unique: ${!row.NON_UNIQUE}, order: #${ascOrDesc}, elementNames: [
EOD                    
                  }
                  output += <<EOD
${ordinal === 1 ? "" : ", "}'${row.COLUMN_NAME}'
EOD              
                  return output;
                },
                afterLast: function(){
                  var output = <<EOD
]}
    ]    
EOD
                  return output;
                }
              });
              

              var columns = metadata.getColumns(
                row.TABLE_CAT, row.TABLE_SCHEM,
                row.TABLE_NAME, "%"
              );
              var columnDefs = "", typeDefs = "", insertType = "";
              iterateResultset(columns, {
                beforeFirst: function(){
                  var row = this.row;
                  var tableName = row.TABLE_NAME;
                  var parsedTableName = parseTableName(tableName);
                  var insertTypeName = "t_" + parsedTableName.entityName.toLowerCase() + "_input";
                  
                  var procPackage = null; //FIXME
                  var procName = null; //FIXME
                  proc += <<EOD 

/**
* 
* Procedure implements 
*
*/
PROCEDURE "${row.TABLE_SCHEM}"."${procPackage}::${procName}"(
)

EOD                  
                  insertType = <<EOD

    type ${insertTypeName} {
EOD                  
                },
                forEach: function(){
                  var row = this.row;
                  var type, _columnType = getColumnTypeKey(row);
                  if (_columnTypes[_columnType] > 1) {
                    type = getColumnTypeName(row.COLUMN_NAME);
                  }
                  else {
                    _columnType = JSON.parse(_columnType);
                    typeDefs += getColumnTypeDef.apply(null, _columnType);
                    type = getColumnTypeName(_columnType[0]);
                  }
                  var columnName = row.COLUMN_NAME;
                  insertType += <<EOD
                  
      ${columnName.toLowerCase()}: ${type};
EOD                  
                  columnDefs += <<EOD

      ${pkColumns[columnName] ? "key" : "   "} ${columnName}: ${type}${row.IS_NULLABLE === "NO" ? " not null" : ""};
EOD
                },
                afterLast: function(){
                  insertType += <<EOD

    };
EOD                  
                }
              });
  
              var importedKeys = metadata.getImportedKeys(row.TABLE_CAT, row.TABLE_SCHEM, row.TABLE_NAME);
              var associations = "";
              iterateResultset(importedKeys, {
                forEach: function(){
                  var row = this.row;
                  if (row.KEY_SEQ === 1) {
                    if (associations) {
                      associations += ";";
                    }
                    associations += <<EOD

      ${row.FK_NAME}: Association[1] to ${parseTableName(row.PKTABLE_NAME).entityName} on 
EOD                    
                  }
                  else {
                    associations += " and ";
                  }
                  associations += <<EOD
${row.FK_NAME}.${row.PKCOLUMN_NAME} = ${row.FKCOLUMN_NAME}
EOD                  
                },
                afterLast: function(){
                  associations += ";";
                }
              });
              var entityName = parseTableName(row.TABLE_NAME).entityName;
              output += <<EOD


    /**
    *
    * Type and Entity definitions for ${entityName} 
    *
    */${typeDefs}${insertType}

    @Catalog.tableType: #COLUMN ${indexDefs}    
    ${pkColumnCount === 0 ? "@nokey\n    " : ""}entity ${entityName} {
${columnDefs}${associations}

    };

EOD          
              
            }
          });
          
          output += <<EOD

};
EOD          
          

          if (hdbddPrintStream) {
            hdbddPrintStream.print(output);
            hdbddPrintStream.close();
          }
          else {
            print(output);
          }
        }
      });
      
      connection.close();
    }
  );

})();