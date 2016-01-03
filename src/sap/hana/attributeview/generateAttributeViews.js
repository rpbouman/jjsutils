(function(){

  return define(
    "../../../args/Args.js",
    "../../../jdbc/createTableIterator.js",     
    "../HanaJdbcHelper.js",
    "../HanaViewGeneratorHelper.js",
    function(args, createTableIterator, hanaJdbcHelper, hanaViewGeneratorHelper){
      
      hanaJdbcHelper.defineArgs();
      hanaViewGeneratorHelper.defineArgs();
      args.set("tableprefix", "DIM_"); 
      args.set("viewprefix", "AT_");      
      hanaViewGeneratorHelper.initArgs();
              
      var columnCallbacks = {
        beforeAll: function(){
          var tableIterator = this.tableIterator;
          var primaryKeyColumns = {};
          tableIterator.iteratePrimaryKeyColumns({
            forEach: function(){
              var row = this.row;
              primaryKeyColumns[row.COLUMN_NAME] = row;
            }
          });
          this.primaryKeyColumns = primaryKeyColumns;
        },
        forEach: function(){
          var row = this.row;
          var schemaName = row.TABLE_SCHEM;
          var tableName = row.TABLE_NAME;
          var columnName = row.COLUMN_NAME;
          var friendlyName = hanaViewGeneratorHelper.getFriendlyName(columnName);
          var primaryKeyColumn = this.primaryKeyColumns[columnName];
          var isKey = typeof(primaryKeyColumn) !== "undefined";
          output = <<EOD

    <attribute 
      id="${hanaViewGeneratorHelper.escapeXml(columnName)}" 
      key="${isKey}" 
      order="1" 
      attributeHierarchyActive="false" 
      displayAttribute="false"
    >
      <descriptions 
        defaultDescription="${hanaViewGeneratorHelper.escapeXml(friendlyName)}"
      />
      <keyMapping 
        schemaName="${hanaViewGeneratorHelper.escapeXml(schemaName)}" 
        columnObjectName="${hanaViewGeneratorHelper.escapeXml(tableName)}" 
        columnName="${hanaViewGeneratorHelper.escapeXml(columnName)}"
      />
    </attribute>
EOD        
          return output;
        }
      };

      var primaryKeyColumnCallbacks = {
        beforeFirst: function(){
          var objectName = hanaViewGeneratorHelper.getObjectName(this.row.TABLE_NAME);
          var friendlyName = hanaViewGeneratorHelper.getFriendlyName(objectName);
          var hierarchyDescription = friendlyName + " Hierarchy1";

          var hierarchyName = "HIER_" + objectName + "1";
          
          var output = <<EOD
    <hierarchy 
      xsi:type="Dimension:LeveledHierarchy" 
      id="${hierarchyName}" 
      aggregateAllNodes="true" 
      rootNodeVisibility="ADD_ROOT_NODE" 
      withRootNode="true" 
      nodeStyle="LEVEL_NAME"
    >
      <descriptions defaultDescription="${hanaViewGeneratorHelper.escapeXml(hierarchyDescription)}"/>
      <levels>
EOD       
          return output;
        },
        forEach: function(){
          var output = <<EOD

        <level 
          levelAttribute="#${hanaViewGeneratorHelper.escapeXml(this.row.COLUMN_NAME)}" 
          levelType="MDLEVEL_TYPE_REGULAR" 
          order="1" 
          orderAttribute="#${hanaViewGeneratorHelper.escapeXml(this.row.COLUMN_NAME)}"
        />
EOD          
          return output;
        },
        afterLast: function(){
          var output = <<EOD
      </levels>
    </hierarchy>          
EOD       
          return output;
        }
      }
      
      tableIteratorCallbacks = {
        ifNone: function(){
          print("No tables to process.");
        },
        forEach: function(){
          var tableName = this.row.TABLE_NAME;
          var id = hanaViewGeneratorHelper.getViewName(tableName);
          var objectName = hanaViewGeneratorHelper.getObjectName(tableName);
          var friendlyName = hanaViewGeneratorHelper.getFriendlyName(objectName);
          var description = friendlyName + " Dimension";

          var output = <<EOD
<?xml version="1.0" encoding="UTF-8"?>
<Dimension:dimension 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:Dimension="http://www.sap.com/ndb/BiModelDimension.ecore" 
  schemaVersion="1.2" 
  id="${hanaViewGeneratorHelper.escapeXml(id)}" 
  applyPrivilegeType="ANALYTIC_PRIVILEGE" 
  checkAnalyticPrivileges="true" 
  defaultClient="$$client$$" 
  defaultLanguage="$$language$$" 
  visibility="internal" 
  dimensionType="Standard"
>
  <descriptions 
    defaultDescription="${hanaViewGeneratorHelper.escapeXml(description)}"
  />
  <attributes>
${this.iterateColumns(columnCallbacks)}
  </attributes>
  <calculatedAttributes/>
  <privateDataFoundation>
    <tableProxies>
      <tableProxy>
        <table 
          schemaName="${hanaViewGeneratorHelper.escapeXml(this.row.TABLE_SCHEM)}" 
          columnObjectName="${hanaViewGeneratorHelper.escapeXml(tableName)}"
        />
      </tableProxy>
    </tableProxies>
    <joins/>
    <layout>
      <shapes>
        <shape 
          modelObjectName="${hanaViewGeneratorHelper.escapeXml(this.row.TABLE_NAME)}" 
          modelObjectNameSpace="${hanaViewGeneratorHelper.escapeXml(this.row.TABLE_SCHEM)}" 
          modelObjectType="catalog"
        >
          <upperLeftCorner x="70" y="30"/>
        </shape>
        <shape 
          modelObjectName="DataFoundation" 
          modelObjectNameSpace="DataFoundation" 
          modelObjectType="repository"
        >
          <upperLeftCorner x="40" y="85"/>
          <rectangleSize/>
        </shape>
      </shapes>
    </layout>
  </privateDataFoundation>
  <hierarchies>
${this.iteratePrimaryKeyColumns(primaryKeyColumnCallbacks)}  
  </hierarchies>
</Dimension:dimension>          
EOD          
          var viewName = hanaViewGeneratorHelper.getViewName(this.row.TABLE_NAME);
          var fileName = viewName + ".attributeview";
          hanaViewGeneratorHelper.handleOutput(output, fileName);
          return output;
        }
      };
            
      var connectionProperties = hanaJdbcHelper.getConnectionProperties();
      var tablesFilter = hanaViewGeneratorHelper.getTablesFilter();
      var tableIterator = createTableIterator(
        connectionProperties, 
        tablesFilter,
        tableIteratorCallbacks
      );
      return tableIterator.iterate();
    }
  );
  
})();