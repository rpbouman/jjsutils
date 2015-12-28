/**
* @module TabeIterator
*/
(function(exports){
/**
*
* A factory for creating table Iterators.
* A table iterator enables iteration over the table metadata exposed by a JDBC connection.
* (see: see: java.sql.DatabaseMetaData#getTables))
*
* In addition to just enabling iteration over the tables, the table iterator also has 
* methods to retrieve and iterate over related metadata, such as 
* columns, primary key columns, imported key columns (foreign key columns), 
* exported key columns (foreign key columns that refer to the current table), and
* index columns.
*
* For an example of how to use the TabeIteratorFactory, checkout the TableIteratorSample.
*
* @class TabeIteratorFactory
* @static
* @requires jdbc
* @requires resultsetIterator
*/

  return define(
    "jdbc.js", "iterateResultset.js", 
    function(jdbc, iterateResultset){
      
      /**
      *
      * Takes connection properties to establish a jdbc connection, 
      * and applies the specified filter to obtain (a subset of) its table metdata.
      * Finally, it creates an ResultsetIterator for the table metadata, 
      * which uses the specified callbacks.
      *
      * @method createTableIterator
      * @param {JDBCConnectionProperties} connectionProperties
      * @param {object} filter
      * @param {TableIteratorCallbacks} callbacks
      */
      function createTableIterator(connectionProperties, filter, callbacks){
        var connection;
        var connectionPropertiesType = typeof(connectionProperties);
        switch (connectionPropertiesType) {
          case "string":
            connection = jdbc.get(connectionProperties);
            break;
          case "object":
            connection = jdbc.open(connectionProperties);
            break;
          default:
            throw new Error("Connectionproperties must be either a connection name or a object specifying connection properties.");
        }
        var metadata = connection.getMetaData();
        
        var catalog = filter.catalog || null;
        var schemaPattern = filter.schemaPattern || null;
        var tablePattern = filter.tablePattern || "%";
        var tableTypes = filter.tableTypes;
        if (!tableTypes) {
          tableTypes = null;
        }
        else
        if (typeof(tableTypes) === "string") {
          tableTypes = tableTypes.split(",");
        }
        
        var tables = metadata.getTables(catalog, schemaPattern, tablePattern, tableTypes);

        function getCatalogSchemaTable(){
          var row = this.row;
          return {
            catalog: row.TABLE_CAT, 
            schema: row.TABLE_SCHEM, 
            table: row.TABLE_NAME
          };
        }
        
        function closeConnection(){
          if (typeof(connectionProperties) === "string") {
            return;
          }
          try {
            connection.close();
          }
          catch (e){
            //fall through. Not much we can do here.
          }
        }
        
        var me = callbacks;
        /**
        *
        * The TableIteratorCallbacks class is a {{#crosslink "ResultsetIterator"}}{{/crossLink}}.
        * The caller can provide all the usual hooks for a plain {{#crosslink "ResultsetIterator"}}{{/crossLink}}, 
        * and then pass it to the {{#crosslink "TabeIteratorFactory/createTableIterator:method"}} method.
        *
        * @class TableIteratorCallbacks
        * @extends ResultsetIteratorCallbacks
        */
        var methods = {
          /**
          * Do the iteration over the tables associated with the connection and the passed filter properties.
          *
          * @method iterate
          */
          iterate: function(){
            var output = iterateResultset(tables, me);
            closeConnection();
            return output;
          },
          /**
          * Retrieves the columns associated with the table that is currently considered in the iteration, 
          * and iterates through those.
          *
          * @method iterateColumns
          * @param {ResultsetIteratorCallbacks} callbacks Object containing the hooks to be called while iterating through this set of columns.
          */
          iterateColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getColumns(args.catalog, args.schema, args.table, "%");
            return iterateResultset(resultset, callbacks);
          },
          /**
          * Retrieves the primary key columns associated with the table that is currently considered in the iteration, 
          * and iterates through those.
          *
          * @method iteratePrimaryKeyColumns
          * @param {ResultsetIteratorCallbacks} callbacks Object containing the hooks to be called while iterating through this set of primary key columns.
          */
          iteratePrimaryKeyColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getPrimaryKeys(args.catalog, args.schema, args.table);
            return iterateResultset(resultset, callbacks);
          },
          /**
          * Retrieves the imported key columns (i.e. those columns on which a foreign key is defined) associated with the table that is currently considered in the iteration, 
          * and iterates through those.
          *
          * @method iteratePrimaryKeyColumns
          * @param {ResultsetIteratorCallbacks} callbacks Object containing the hooks to be called while iterating through this set of imported key columns.
          */
          iterateImportedKeyColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getImportedKeys(args.catalog, args.schema, args.table);
            return iterateResultset(resultset, callbacks);
          },
          /**
          * Retrieves the exported key columns (i.e. those columns from this table that are referenced by foreign keys in other tables) associated 
          * with the table that is currently considered in the iteration, and iterates through those.
          *
          * @method iterateImportedKeyColumns
          * @param {ResultsetIteratorCallbacks} callbacks Object containing the hooks to be called while iterating through this set of imported key columns.
          */
          iterateExportedKeyColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getExportedKeys.apply(metadata, args);
            return iterateResultset(resultset, callbacks);
          },
          /**
          * Retrieves the index columns associated with the table that is currently considered in the iteration, and iterates through those.
          *
          * @method iterateIndexColumns
          * @param {ResultsetIteratorCallbacks} callbacks Object containing the hooks to be called while iterating through this set of index columns.
          */
          iterateIndexColumns: function(callbacks, unique, approximate){
            var args = getCatalogSchemaTable.call(me);
            unique = unique || false;
            approximate = approximate || true;
            var resultset = metadata.getIndexInfo(args.catalog, args.schema, args.table, unique, approximate);
            return iterateResultset(resultset, callbacks);
          }
        };
        
        var method;
        for (method in methods){
          callbacks[method] = methods[method];
        }
                
        return callbacks;
      }
      return createTableIterator;
    }
  );
})(this);