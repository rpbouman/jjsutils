/**
* The jdbc module provides access to java database connectivity (JDBC).
* Typically you acquire access to the module by naming it as a dependency in a call to `define()` 
* when defining your own module.
* The object passed to the `define()` callback to represent the dependency can be considered 
* a singleton `jdbc` class, which exposes all its functionality as static methods.
*
* @module jdbc
*/
(function(exports){
/**
* This is not a standalone class. Rather it describes the properties required to establish a JDBC connection.
* As such it appears as type for arguments to various methods that use JDBC.
*
* @Class JDBCConnectionProperties
*/

/**
* The name for the connection. If the name is present when the JDBCConnectionProperties object is passed to a method
* that creates a connection, then this name will be used to store this connection in a connection cache. The name can
* then later be used to retrieve the connection.
* If passed to functions that just need a connection to work with, then an attempt will be made to retrieve the connection.
* If the connection cannot be retrieved, and the JDBCConnectionProperties also contains properties that can be used to create 
* a connection, then a connection will be created and stored under this name.
*
* @property {name} name The name that will be used to store this connection in the connection cache.
* @optional
*/

/**
*
* If present, the driver property will be used to load the JDBC driver class. 
* This should take care of registering the driver with the JDBC DriverManager.
*
* @property {string} driver The fully qualified (java) class name of the JDBC driver that manages the connection.
* @optional
*/


/**
* A class to create JDBC database connections.
* Can also load JDBC drivers dynamically from a jar file.
*
* Example:
*
*     (function(){
*       define("src/jdbc/jdbc.js", function(jdbc){
* 
*         var connection = jdbc.openConnection({
*           //optional: specify a name so you can refer to this connection by name later on`
*           name: "My Sakila Connection",
*           //The fully qualified class name of the driver. Optional if you're sure the driver was already registered.
*           driver: "com.mysql.jdbc.Driver",
*           //A string that can be resolved as a path identifying a jar file that contains the driver.
*           //This is required to load drivers dyntamically from jar files that are not on the class path.
*           jar: "/usr/share/java/mysql-connection-java-5.1.38-bin.jar",
*           //The driver specific JDBC url to connect to your database.
*           url: "jdbc:mysql://localhost/sakila",
*           //JDBC user.
*           user: "sakila",
*           //JDBC password.
*           password: "sakila"
*         });
*
*         ...use the connection...
*
*         //get an existing connection
*         var connection = jdbc.getConnection("My Sakila Connection");
*
*         //close existing connection
*         jdbc.closeConnection("My Sakila Connection");
*
*         //You can also explicitly close the connection itself:
*         connection.close();
*
*       });
*     })();
*
* @class JDBC
* @static
*/
  
  var Class = Java.type("java.lang.Class");
  var DriverManager = Java.type("java.sql.DriverManager");

  var connections = {};

  function loadDriverClassFromJar(jar, driver){
    var File = Java.type("java.io.File");
    var file = new File(jar);
    var uri = file.toURI();
    var url = uri.toURL();
    var URLClassLoader = Java.type("java.net.URLClassLoader");
    var urlClassLoader = new URLClassLoader([url], file.getClass().getClassLoader());
    var driverClass = Class.forName(driver, true, urlClassLoader);
    return driverClass;
  }
    
  /**
  *
  * Load a JDBC driver, and register it with the JDBC DriverManager.
  *
  * The `conf` argument can either be a string, or an object.
  *
  * If it is a string, it should be the fully qualified class name of the driver.
  * This class will then be loaded and this should automatically register the driver with the driver manager.
  * In order for this to work, the driver should already be on the system classpath.
  * To dynamically load a JDBC driver from a jar that is not on the classpath, consider passing a `conf` object instead.
  * 
  * If `conf` is an object, it should have a `driver` key, which should be the fully qualified class name of the driver.
  *
  * Optionally, the conf object can contain a `jar` key. 
  * If a `jar` key is specified, then an attempt will be made to load the driver class from the specified jarfile.
  * To register the driver with the DriverManager, it is passed to an instance of the jjsutils DriverDelegate.
  * The DriverDelegate is a utility class that wraps the dyncamically loaded Driver from the jar.
  * Since the DriverDelegate is assumed to be in the classpath, this can be succesfully registred by the DriverManager.
  * 
  * @method loadDriver
  * @param conf {string | JDBCConnectionProperties} 
  * @static
  */
  function loadDriver(conf){
    var typeOfConf = typeof(conf);
    
    var driver, jar, driverClass;
    switch (typeOfConf) {
      case "string":
        driver = conf;
        break;
      case "object":
        driver = conf.driver;
        jar = conf.jar;
        break;
      default: 
        throw new Error("Configuration must either be a driverName or an object with a driver key, and optionally a jar key.");
    }
    
    if (jar) {
      var DriverDelegate = Java.type("org.jjsutils.jdbc.DriverDelegate");
      var driver = new DriverDelegate(driver, jar);
    }
    else {
      driverClass = Class.forName(driver);
    }
    return driverClass;
  }
  
  function connect(conf, driverManager){
    var connection = DriverManager.getConnection(conf.url, conf.user, conf.password);
    if (conf.name) {
      connections[name] = connection;
    }
    return connection;
  }
    
  /**
  * Opens a JDBC connection based on properties passed in the argument configuration object.
  *
  * The configuration object supports the following properties:
  * * driver
  * * jar
  * * url
  * * user
  * * password
  * * name
  *
  * The driver and jar properties maybe used by `loadDriver()` to load the driver.
  * The url, user and password properties are used to obtain a connection from the JDBC DriverManager
  * The name (if present) will be used to store this connection in a cache of connections.
  * This way you can later refer to this connection by name using `getConnection()`.
  *
  * @method openConnection
  * @static
  * @param {JDBCConnectionProperties} conf An object that specifies data required to actually establish the JDBC connection.
  * @return {java.sql.Connection} Retuns the JDBC connection.
  */
  function openConnection(conf){
    if (conf.driver) {
      loadDriver(conf);
    }
    var connection = connect(conf);
    return connection;
  }
  
  /**
  * Obtain a connection created prior with `openConnection()`.
  *
  * @method getConnection
  * @static
  * @param {string} name The name of a connection created prior using `openConnection()`. 
  * @return {java.sql.Connection} The connection.
  */
  function getConnection(name){
    return connections[name];
  }
  
  function obtainConnection(connection) {
    var type = typeof(connection);
    var conn;
    if (type === "string") {
      if (!(conn = getConnection(connection))) {
        throw new Error("No such connection: " + connection);
      }
    }
    else
    if (type === "object") {
      var name = connection.name;
      if (typeof(name) === "string") {
        conn = getConnection(connection);
      }
      
      if (!conn) {
        conn = openConnection(connection);
      }
    }
    
    if (!conn) {
      throw new Error("Could not open connection.");
    }
    
    return conn;
  }
  
  /**
  *
  * Execute a SQL-SELECT statement (a query) and obtain the results.
  *
  * @method query
  * @static
  * @param {string | object} connection Either a connection name, or an object such as one would pass to `openConnection()`.
  * @param {string} sql A SQL SELECT statement.
  * @return {java.sql.ResultSet} A resultset object that represents the result of the SQL query.
  */
  function executeQuery(connection, sql){
    var conn = obtainConnection(connection);

    var res;
    try {
      var stmt = conn.createStatement();
      res = stmt.executeQuery(sql);
    }
    catch (e){
      throw e;
    }
    
    return res;
  }

  /**
  *
  * Execute a non-query SQL statement (a INSERT, UPDATE, DELETE or DDL statement) and obtain the results.
  *
  * @method execute
  * @static
  * @param {string | object} connection Either a connection name, or an object such as one would pass to `openConnection()`.
  * @param {string} sql A SQL DDL statement, or INSERT, UPDATE, DELETE statement.
  * @return {java.sql.ResultSet} A resultset object that represents the result of the SQL query.
  */
  function executeUpdate(connection, sql){
    var conn = obtainConnection(connection);

    var res;
    try {
      var stmt = conn.createStatement();
      res = stmt.executeUpdate(sql);
    }
    catch (e){
      throw e;
    }
    
    return res;
  }

  /**
  * Close a connection created prior with `openConnection()`, and remove it from the connection cache.
  *
  * @method closeConnection
  * @static
  * @param {string} name The name of a connection created prior using `openConnection()`. 
  */
  function closeConnection(name) {
    var connection = connections[name];
    if (typeof(connection) === "undefined") {
      return;
    }
    delete connections[name];
    connection.close();
  }  
  
  /**
  * Closes all connections stored in the connection cache.
  *
  * @method closeAllConnections
  * @static
  */
  function closeAllConnections(){
    var name;
    for (name in connections) {
      try {
        closeConnection(name);
      }
      catch (e) {
        
      }
    }
  }
  
  return define(function(){
    return {
      loadDriver: loadDriver,
      openConnection: openConnection,
      query: executeQuery,
      execute: executeUpdate,
      getConnection: getConnection,
      closeConnection: closeConnection,
      closeAll: closeAllConnections
    };
  });
})(this);