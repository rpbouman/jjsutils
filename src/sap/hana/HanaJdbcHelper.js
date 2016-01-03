(function(){
  
  return define(
    "../../args/Args.js", 
    "../../jdbc/Jdbc.js", 
    function(args, jdbc){
      var System = Java.type("java.lang.System");
      
      function defineHanaJdbcArgs(){
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
            
      return {
        defineArgs: defineHanaJdbcArgs,
        checkInstance: checkHanaInstance,
        getJdbcUrl: getSapHanaJdbcUrl,
        getConnectionProperties: getHanaJdbcConnectionProperties,
        getConnection: getHanaJdbcConnection
      };
    }
  );
})();