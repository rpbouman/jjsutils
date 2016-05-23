(function(){

  return define(
    "../../args/Args.js", 
    "../../jdbc/Jdbc.js", 
    function(args, jdbc){
      var System = Java.type("java.lang.System");
      
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
      
      function getLocationOfSapJdbcJar(){
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
        return sapJdbcJar;
      }
      
      function getSapJdbcDriverClassName(){
        return "com.sap.db.jdbc.Driver";
      }
      
      function defineHanaJdbcArgs(){
        var sapJdbcJar = getLocationOfSapJdbcJar();
        
        args.define({
          name: "hanadriverjar",
          help: "Location of SAP/HANA .jar file containing the JDBC driver.",
          value: sapJdbcJar
        },{
          name: "hanadriver",
          help: "Fully qualified class name of the SAP/HANA JDBC driver.",
          value: "com.sap.db.jdbc.Driver"
        }, {
          name: "hanahost",
          help: "SAP/HANA Host to establish JDBC connection.",
          mandatory: true        
        }, {
          name: "hanainstance",
          help: "Host to establish JDBC connection.",
          mandatory: true,
          value: "00",
          parse: function(value){
            return checkHanaInstance(value);
          }
        }, {
          name: "hanauser",
          help: "SAP/HANA User to establish JDBC connection.",
          mandatory: true        
        }, {
          name: "hanapassword",
          help: "SAP/HANA Password to establish JDBC connection.",
          mandatory: true
        });
      }
      
      function checkHanaInstance(value) {
        var iInst = parseInt(value);
        if (isNaN(iInst)) {
          throw new Error("Ivalid value for SAP/HANA Instance: " +  value);
        }
        if (iInst < 9) {
          iInst = "0" + iInst;
        }
        return String(iInst);
      }
      
      function getSapHanaJdbcUrl(host, instance){
        if (!host) {
          host = args.get("hanahost");
        }
        if (!instance) {
          instance = args.get("hanainstance");
        }
        instance = checkHanaInstance(instance);
        var url = "jdbc:sap://" + host + ":3" + instance + "15/";
        return url;
      }
      
      function getHanaJdbcConnectionProperties(host, instance){
        var connectionProperties = {
          driver: args.get("hanadriver"),
          jar: args.get("hanadriverjar"),
          url: getSapHanaJdbcUrl(host, instance),
          user: args.get("hanauser"),
          password: args.get("hanapassword")
        };
        return connectionProperties
      }
            
      function getHanaJdbcConnection(connectionProperties){
        connectionProperties = connectionProperties || getHanaJdbcConnectionProperties();
        var connection = jdbc.openConnection(connectionProperties);
        return connection;
      }
      
      function getHanaJdbcTypes(){
        var hanaTypes = {
          //LONGNVARCHAR
          "-16": {
            alternative: {
              type: "2011",
              name: "NCLOB"
            }
          },
          "-15": {
            preferredTypeName: "NCHAR",
            typeNames: {
              "NCHAR": {
                params: {length: true},
                maxlength: 2000
              }
            }
          },
          "-9": {
            preferredTypeName: "NVARCHAR",
            typeNames: {
              "ALPHANUM": {
                params: {length: true},
                maxlength: 127
              },
              "NVARCHAR": {
                params: {length: true},
                maxlength: 5000
              },
              "SHORTTEXT": {
                params: {length: true},
                maxlength: 5000
              },
            }
          },
          //ROWID:
          "-8": null,
          //BIT
          "-7": null,
          "-6": {
            preferredTypeName: "TINYINT",
            typeNames: {"TINYINT": {}}
          },
          "-5": {
            preferredTypeName: "BIGINT",
            typeNames: {"BIGINT": {}}
          },
          //LONGVARBINARY
          "-4": {
            alternative: {
              type: "2004",
              name: "BLOB"
            }
          },
          "-3": {
            preferredTypeName: "VARBINARY",
            typeNames: {
              "VARBINARY": {
                params: {length: true},
                maxlength: 5000
              }
            }
          },
          "-2": {
            preferredTypeName: "BINARY",
            typeNames: {
              "BINARY": {
                params: {length: true},
                maxlength: 2000
              }
            }
          },
          //LONGVARCHAR
          "-1": {
            alternative: {
              type: "2005",
              name: "CLOB"
            }
          },
          //NULL
          "0": null,
          "1": {
            preferredTypeName: "CHAR",
            typeNames: {
              "CHAR": {
                params: {length: true},
                maxlength: 2000
              }
            }
          },
          //NUMERIC`
          "2": {
            alternative: {
              type: "3",
              name: "DECIMAL"
            }
          },
          "3": {
            preferredTypeName: "DECIMAL",
            typeNames: {
              "DECIMAL": {
                params: {precision: true, scale: true},
                maxprecision: 34
              },
              "SMALLDECIMAL": {
                params: {precision: true, scale: true},
                maxprecision: 16
              }
            }
          },
          "4": {
            preferredTypeName: "INTEGER",
            typeNames: {"INTEGER": {}}
          },
          "5": {
            preferredTypeName: "SMALLINT",
            typeNames: {"SMALLINT": {}}
          },
          //FLOAT
          "6": {
            alternative: {
              type: "8",
              name: "DOUBLE"
            }
          },
          "7": {
            preferredTypeName: "REAL",
            typeNames: {"REAL": {}}
          },
          "8": {
            preferredTypeName: "DOUBLE",
            typeNames: {"DOUBLE": {}}
          },
          "12": {
            preferredTypeName: "VARCHAR",
            typeNames: {
              "VARCHAR": {
                params: {length: true},
                maxlength: 5000
              }
            }
          },
          "16": {
            preferredTypeName: "BOOLEAN",
            typeNames: {"BOOLEAN": {}}
          },
          //DATALINK
          "70": null,
          "91": {
            preferredTypeName: "DATE`",
            typeNames: {"DATE": {}}
          },
          "92": {
            preferredTypeName: "TIME",
            typeNames: {"TIME": {}}
          },
          "93": {
            preferredTypeName: "TIMESTAMP",
            typeNames: {
              "SECONDDATE": {},
              "TIMESTAMP": {}
            }
          },
          //OTHER:
          "1111": null,
          //JAVA_OBJECT
          "2000": null,
          //DISTINCT
          "2001": null,
          //STRUCT
          "2002": null,
          //ARRAY
          "2003": null,
          "2004": {
            preferredTypeName: "BLOB",
            typeNames: {
              "BLOB": {},
              "ST_GEOMETRY": {},
              "ST_POINT": {}
            }
          },
          "2005": {
            preferredTypeName: "CLOB",
            typeNames: {"CLOB": {}}
          },
          //REF:
          "2006": null,
          //SQLXML:
          "2009": null,
          "2011": {
            preferredTypeName: "NCLOB",
            typeNames: {
              "BINTEXT": {},
              "NCLOB": {},
              "TEXT": {}
            }
          },
          //REF_CURSOR:
          "2012": null,
          //TIME_WITH_TIMEZONE
          "2013": {
            alternative: {
              type: "92",
              name: "TIME"
            }
          },
          //TIMESTAMP_WITH_TIMEZONE
          "2014": {
            alternative: {
              type: "93",
              name: "TIMESTAMP"
            }
          }
        };
        return hanaTypes;
      }
            
      return {
        getFriendlyName: getFriendlyName,
        getLocationOfSapJdbcJar: getLocationOfSapJdbcJar,
        getSapJdbcDriverClassName: getSapJdbcDriverClassName,
        defineArgs: defineHanaJdbcArgs,
        checkInstance: checkHanaInstance,
        getJdbcUrl: getSapHanaJdbcUrl,
        getConnectionProperties: getHanaJdbcConnectionProperties,
        getConnection: getHanaJdbcConnection,
        getHanaJdbcTypes: getHanaJdbcTypes
      };
    }
  );
})();