(function(exports){
  
  return define(
    "jdbc.js", "iterateResultset.js", 
    function(jdbc, iterateResultset){
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
        var methods = {
          iterate: function(){
            var output = iterateResultset(tables, me);
            closeConnection();
            return output;
          },
          iterateColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getColumns(args.catalog, args.schema, args.table, "%");
            return iterateResultset(resultset, callbacks);
          },
          iteratePrimaryKeyColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getPrimaryKeys(args.catalog, args.schema, args.table);
            return iterateResultset(resultset, callbacks);
          },
          iterateImportedKeyColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getImportedKeys(args.catalog, args.schema, args.table);
            return iterateResultset(resultset, callbacks);
          },
          iterateExportedKeyColumns: function(callbacks){
            var args = getCatalogSchemaTable.call(me);
            var resultset = metadata.getExportedKeys.apply(metadata, args);
            return iterateResultset(resultset, callbacks);
          },
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