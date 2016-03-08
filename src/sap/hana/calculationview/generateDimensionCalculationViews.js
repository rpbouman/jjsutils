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
      args.set("viewprefix", "CAD_");      
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
        order="${row.ORDINAL_POSITION}" 
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
  <inlineHierarchy 
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
  </inlineHierarchy>          
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
<Calculation:scenario 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:Calculation="http://www.sap.com/ndb/BiModelCalculation.ecore" 
  xmlns:Dimension="http://www.sap.com/ndb/BiModelDimension.ecore" 
  schemaVersion="2.3" 
  id="${hanaViewGeneratorHelper.escapeXml(id)}" 
  applyPrivilegeType="ANALYTIC_PRIVILEGE" 
  checkAnalyticPrivileges="true" 
  defaultClient="$$client$$" 
  defaultLanguage="$$language$$" 
  visibility="internal" 
  calculationScenarioType="TREE_BASED" 
  dataCategory="DIMENSION" 
  enforceSqlExecution="false" 
  executionSemantic="UNDEFINED" 
  outputViewType="Projection"
>
  <descriptions 
    defaultDescription="${hanaViewGeneratorHelper.escapeXml(description)}"
  />
  <localVariables/>
  <variableMappings/>
  <dataSources>
    <DataSource 
      id="${hanaViewGeneratorHelper.escapeXml(tableName)}" 
      type="DATA_BASE_TABLE"
    >
      <viewAttributes allViewAttributes="true"/>
      <columnObject 
        schemaName="${hanaViewGeneratorHelper.escapeXml(this.row.TABLE_SCHEM)}" 
        columnObjectName="${hanaViewGeneratorHelper.escapeXml(tableName)}"
      />
    </DataSource>
  </dataSources>
  <calculationViews/>
${this.iteratePrimaryKeyColumns(primaryKeyColumnCallbacks)}  
  <logicalModel 
    id="${hanaViewGeneratorHelper.escapeXml(tableName)}"
  >
    <attributes>
${this.iterateColumns(columnCallbacks)}
    </attributes>
    <calculatedAttributes/>
    <privateDataFoundation>
      <tableProxies/>
      <joins/>
      <layout>
        <shapes/>
      </layout>
    </privateDataFoundation>
    <baseMeasures/>
    <calculatedMeasures/>
    <restrictedMeasures/>
    <localDimensions/>
  </logicalModel>
  <layout>
    <shapes>
      <shape expanded="true" modelObjectName="Output" modelObjectNameSpace="MeasureGroup">
        <upperLeftCorner x="40" y="85"/>
        <rectangleSize height="0" width="0"/>
      </shape>
    </shapes>
  </layout>
</Calculation:scenario>
EOD          
          var viewName = hanaViewGeneratorHelper.getViewName(this.row.TABLE_NAME);
          var fileName = viewName + ".calculationview";
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