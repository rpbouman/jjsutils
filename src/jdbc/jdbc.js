(function(exports){
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
  
  function openConnection(conf){
    if (conf.driver) {
      loadDriver(conf);
    }
    var connection = connect(conf);
    return connection;
  }
  
  function getConnection(name){
    return connections[name];
  }

  function closeConnection(name) {
    var connection = connections[name];
    if (typeof(connection) === "undefined") {
      return;
    }
    delete connections[name];
    connection.close();
  }  
  
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
      open: openConnection,
      get: getConnection,
      close: closeConnection,
      closeAll: closeAllConnections
    };
  });
})(this);