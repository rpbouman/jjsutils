(function(exports){

  function callCallback(callbacks, name){
    var callback = callbacks[name];
    var type = typeof(callback);
    if (type === "function") {
      return callback.call(callbacks);
    }
    return null;
  }

  function iterateResultSet(resultSet, callbacks){

    callbacks.columns = {};
    callbacks.row = {};
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

    if (output = callCallback(callbacks, "beforeAll")){
      allOutput += output;
    }
    
    while (resultSet.next()) {
      if (callbacks.rowNum === 0) {
        if (output = callCallback(callbacks, "beforeFirst")){
          allOutput += output;
        }
      }

      getRow.call(callbacks);
      callbacks.rowNum++;
      
      if (output = callCallback(callbacks, "forEach")){
        allOutput += output;
      }

    }
    
    if (callbacks.rowNum === 0) {
      if (output = callCallback(callbacks, "ifNone")) {
        allOutput += output; 
      }
    }
    else {
      if (output = callCallback(callbacks, "afterLast")) {
        allOutput += output;
      }
    }
    
    if (output = callCallback(callbacks, "afterAll")) {
      allOutput += output;
    }
    
    return allOutput;
  };

  return define(function(){
      
    return iterateResultSet;
    
  });
  
})(this);