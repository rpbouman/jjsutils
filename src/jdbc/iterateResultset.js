/**
* @module resultsetIterator
*/
(function(exports){
/**
* Provides a convenient way to traverse JDBC resultsets.
* Access to the iteration is provided via a number of hooks that the caller can implement in the `callbacks` argument.
* 
* Example:
*
*     (function(){
*       define(
*         "src/jdbc/jdbc.js", 
*         "src/jdbc/iterateResultset.js", 
*         function(iterateResultset){
*
*           //create a connection
*           var conn = jdbc.openConnection({
*             driver: "com.mysql.jdbc.Driver",
*             url: "jdbc:mysql://localhost/sakila",
*             user: "sakila",
*             password: "sakila"
*           });
*
*           //create a statement
*           var stmt = conn.createStatement();
*
*           //run a query
*           stmt.execute("SELECT * FROM films");
*
*           //obtain the query result
*           var resultset = stmt.getResultSet();
*
*           //iterate the resultset
*           iterateResultset(resultset, {
*             beforeAll: function(){
*              
*             }   
*           });
*         });
*       )
*     })();
*
* @class ResultsetIterator
* @static
*/
  function callCallback(callbacks, name){
    var callback = callbacks[name];
    var type = typeof(callback);
    if (type === "function") {
      return callback.call(callbacks);
    }
    return null;
  }
/**
* Provides a convenient way to traverse JDBC resultsets.
* Access to the iteration is provided via a number of hooks that the caller can implement in the `callbacks` argument.
* The specified callback functions are called in scope of the `callbacks` object.
* In addition, the `callbacks` object is augmented with a few properties to conveniently access the current state of
* the iteration. Properties that are added are:
*
* * `columns`. An object that stores column metadata by column name.
* * `row`. And object that represents the current row of the resultset. Values are stored by column name.
* * `rowNum`. An integer indicating how many rows have been processed.
*
* The hooks that the caller can specify are:
* * `beforeAll()`: Is called once before any iterations are done.
* * `beforeFirst()`: Is called once, right before the first row is iterated. Difference with `beforeAll()` is that `beforeFirst()` is called only when there actually are any rows to iterate, whereas `beforeAll()` is always called, even if there are no rows to iterate.
* * `forEach()`: Is called for each row that is iterated.
* * `afterLast()`: Is called right after the last row was iterated. It is called only if there were any rows to iterate.
* * `afterAll()`: Is called right after the entire iteration sequence. `afterAll()` is always called - even if there were no rows to iterate.
* * `ifNone()`: Is called after `beforeAll()` but before `afterAll()`, but only if there were no rows to iterate.
*
* @method iterateResultSet
* @static
* @param {java.sql.ResultSet} resultSet The `java.sql.ResultSet` to iterate.
* @param {ResultsetIteratorCallbacks} callbacks A callback object having one or more callback functions (hooks) that are called in particualr stages of the iteration process.
*/
  function iterateResultSet(resultSet, callbacks){

    /**
    * Objects that are passed as `callbacks` parameter to `iterateResultSet()` may have a number of callback functions 
    * that are called during the iteration of the java.sql.Resultset that was also passed to `iterateResultSet()`.
    *
    * For documentation purposes we refer to such objects as ResultsetIteratorCallbacks.
    *
    * ResultsetIteratorCallbacks can implement a number of callbacks to be called during specific stages of resultset iteration.
    * ResultsetIteratorCallbacks are also augmented with a number of properties to access data from the resultset.
    * 
    * @class ResultsetIteratorCallbacks
    */
    
    /**
    *
    * The columns property is an object that holds metadata that describes the columns of the iterated resultset.
    * The data for this is obtained from the java.sql.ResultSetMetaData object that is associated with the resultset.
    *
    * Keys of the columns object are the column names. 
    * Values of the columns object are objects that describe the properties for the result set column as key/value pairs.
    *
    * @property columns
    */
    callbacks.columns = {};
    
    /**
    *
    * The row property is an object that holds the values of the row currently being iterated. 
    * Keys of the row property object are the column names of the resultset.
    * Values are obtained by calling java.sql.ResultSet#getObject for the respective column.
    *
    * @property row
    */
    callbacks.row = {};
    
    /**
    * The 1-based ordinal position of the row that is currently being considered by the iterator.
    *
    * @property rowNum
    */
    callbacks.rowNum = 0;

    function getColumns(){
      var meta = resultSet.getMetaData();
      var colCount = meta.getColumnCount();
      var i, column, columns = this.columns;
      for (i = 1; i <= colCount; i++) {
        column = {
          className: meta.getColumnClassName(i),
          displaySize: meta.getColumnDisplaySize(i),
          label: meta.getColumnLabel(i),
          name: meta.getColumnName(i),
          type: meta.getColumnType(i),
          typeName: meta.getColumnTypeName(i),
          precision: meta.getPrecision(i),
          scale: meta.getScale(i),
          isAutoIncrement: meta.isAutoIncrement(i),
          isCaseSensitive: meta.isCaseSensitive(i),
          isCurrency: meta.isCurrency(i),
          isDefinitelyWriteable: meta.isDefinitelyWritable(i),
          isNullable: meta.isNullable(i),
          isReadOnly: meta.isReadOnly(i),
          isSearchable: meta.isSearchable(i),
          isSigned: meta.isSigned(i),
          isWriteable: meta.isWritable(i)
        };
        columns[column.name] = column;
      }
    }
    getColumns.call(callbacks);

    function getRow(){
      var name, columns = this.columns, row = this.row;
      for (name in columns) {
        try {
          row[name] = resultSet.getObject(name);
        }
        catch (e){
          print(resultSet);
        }
      }
    }

    var output, allOutput = "";

    /**
    * The beforeAll callback is called before any rows are iterated.
    * It is always called, even if it turns out that there aren't any rows to iterate over.
    *
    * @method beforeAll
    */
    if (output = callCallback(callbacks, "beforeAll")){
      allOutput += output;
    }
    
    while (resultSet.next()) {
      if (callbacks.rowNum === 0) {
        /**
        * The beforeFirst callback is called right before the first row is iterated.
        * It will only be called if there are in fact rows to iterate.
        *
        * @method beforeFirst
        */
        if (output = callCallback(callbacks, "beforeFirst")){
          allOutput += output;
        }
      }

      getRow.call(callbacks);
      callbacks.rowNum++;
      
      /**
      * The forEach callback is called for each row in the resultset.
      *
      * @method forEach
      */
      if (output = callCallback(callbacks, "forEach")){
        allOutput += output;
      }

    }
    
    if (callbacks.rowNum === 0) {
      /**
      * The ifNone callback is called only if there are no rows to iterate.
      * ifNone is called after `beforeAll()`, but before `afterAll()`. 
      *
      * @method ifNone
      */
      if (output = callCallback(callbacks, "ifNone")) {
        allOutput += output; 
      }
    }
    else {
      /**
      * The afterLast callback is called after all rows have been iterated.
      * It is called only if there was at least one row in the resultset.      
      * If it is called, it is called right before the `afterAll()` callback.
      *
      * @method afterLast
      */
      if (output = callCallback(callbacks, "afterLast")) {
        allOutput += output;
      }
    }
    
    /**
    * The afterAll callback is called after iteration.
    * It is always called, even if there were no rows in the resultset.      
    *
    * @method afterAll
    */
    if (output = callCallback(callbacks, "afterAll")) {
      allOutput += output;
    }
    
    return allOutput;
  };

  return define(function(){
      
    return iterateResultSet;
    
  });
  
})(this);