package org.jjsutils.jdbc;

import java.io.File;

import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;

import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;

import java.util.logging.Logger;
import java.util.Properties;

/**
*   This code owes all to this article: 
*   "Pick your JDBC driver at runtime" by Nick Sayer:
*
*   http://www.kfu.com/~nsayer/Java/dyn-jdbc.html
*
*   Primary purpose is to dynamically load a JDBC driver from a jar that may not have been on the classpath.
*   Once you have the jar, it is not a big deal to load and instantiate the Driver class.
*   But the problem is that afterwards, the new driver must still be registered with the DriverManager.
*   The DriverManager refuses to do so if the driver was not loaded by the system classloader. 
*   
*   The DriverDelegate class offers a workaround. 
*
*   The DriverDelegate is itself a java.sql.Driver, and must be loaded by the system classloader by putting it on the classpath.
*   Once that is taken care of, the DriverDelegate can dynamically load a JDBC driver based on a className and jar path.
*   The DriverDelegate then simply passes all method calls through to the dynamically loaded driver.
*
*/
public class DriverDelegate implements Driver {
  
  protected Driver delegatingDriver;

  /**
  * Creates a new delegating driver of the specified classname that resides in the specified jar.
  *
  * @param className The fully qualified class name of the driver that is to be delegated.
  * @param jar A path identifying the jar file that contains the driver.
  */
  public DriverDelegate(String className, String jar) throws Exception {
    File file = new File(jar);
    URI uri = file.toURI();
    URL url = uri.toURL();
    URL[] urls = new URL[]{url};
    URLClassLoader urlClassLoader = new URLClassLoader(urls, getClass().getClassLoader());
    Class driverClass = Class.forName(className, true, urlClassLoader);
    Driver delegatingDriver = (Driver)driverClass.newInstance();
    this.delegatingDriver = delegatingDriver;
    DriverManager.registerDriver(this);
  }
  
  /**
  * @see java.sql.Driver#acceptsURL(java.lang.String)
  */
	public boolean acceptsURL(String u) throws SQLException {
		return delegatingDriver.acceptsURL(u);
	}
  
  /**
  * @see java.sql.Driver#connect(java.lang.String, java.util.Properties)
  */
	public Connection connect(String u, Properties p) throws SQLException {
		return delegatingDriver.connect(u, p);
	}
  
  /**
  * @see java.sql.Driver#getMajorVersion()
  */
	public int getMajorVersion() {
		return delegatingDriver.getMajorVersion();
	}
  
  /**
  * @see java.sql.Driver#getMinorVersion()
  */
	public int getMinorVersion() {
		return delegatingDriver.getMinorVersion();
	}
  
  /**
  * @see java.sql.Driver#getParentLogger()
  */
	public Logger getParentLogger() throws SQLFeatureNotSupportedException {
		return delegatingDriver.getParentLogger();
	}

  /**
  * @see java.sql.Driver#getPropertyInfo(java.lang.String, java.util.Properties)
  */
	public DriverPropertyInfo[] getPropertyInfo(String u, Properties p) throws SQLException {
		return delegatingDriver.getPropertyInfo(u, p);
	}
  
  /**
  * @see java.sql.Driver#jdbcCompliant()
  */
	public boolean jdbcCompliant() {
		return delegatingDriver.jdbcCompliant();
	}
  
}