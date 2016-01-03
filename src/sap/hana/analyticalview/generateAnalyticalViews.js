(function(){
  File = Java.type("java.io.File");  
  
  return define(
    "../../../args/Args.js",
    "../../../jdbc/createTableIterator.js",     
    "../HanaJdbcHelper.js",
    "../HanaViewGeneratorHelper.js",
    function(args, createTableIterator, hanaJdbcHelper, hanaViewGeneratorHelper){
      
      hanaJdbcHelper.defineArgs();
      hanaViewGeneratorHelper.defineArgs();
      
      args.set("tableprefix", "FACT_"); 
      args.set("viewprefix", "AN_");      
      
      args.define({
        name: "attributeviewdir",
        help: "The hana studio project directory where to find analytical views to use as dimensions."
      });
      
      hanaViewGeneratorHelper.initArgs();
      var attributeViewDirValue = args.get("attributeviewdir");
      if (!attributeViewDirValue) {
        args.set("attributeviewdir", args.get("outputdir"));
      }
      
      function getAttributeViewFiles(attributeViewDirectory){
        var attributeViewDirValue = args.get("attributeviewdir");
        var attributeViewDir = new File(attributeViewDirValue);
        if (!attributeViewDir.isDirectory()){
          throw new Error("Value for attributeviewdir (" + attributeViewDirValue + ") must be an existing directory.");
        }
        var attributeViewFiles = attributeViewDir.listFiles();
        return attributeViewFiles;
      }
      
      function getXpath(){
        var XPahtFactory = Java.type("javax.xml.xpath.XPathFactory");
        var xpathFactory = XPahtFactory.newInstance();
        var xpath = xpathFactory.newXPath();
        /*
        var namespaceContext = createNamespaceContext({
          "xsi": "http://www.w3.org/2001/XMLSchema-instance",
          "Dimension": "http://www.sap.com/ndb/BiModelDimension.ecore"
        });
        xpath.setNamespaceContext(namespaceContext);
        */
        return xpath;
      }
      
      function getAttributeFileInputSource(file){
        var FileReader = Java.type("java.io.FileReader");
        var fileReader = new FileReader(file);
        var InputSource = Java.type("org.xml.sax.InputSource");
        var inputSource = new InputSource(fileReader);
        return inputSource;
      }
      
      var attributeViewKeys = {};
      function getAttributeViewKeys(){
        var xpath = getXpath();
        var xpathExpression = xpath.compile("/*[local-name(.)='dimension']/attributes/attribute[@key='true']");
        var NODESET = Java.type("javax.xml.xpath.XPathConstants").NODESET;

        var attributeViewFiles = getAttributeViewFiles();
        var n = attributeViewFiles.length, i, attributeViewFile, attributeViewFileName, inputSource, keyColumns, node, keyColumn, name, value;
        for (i = 0; i < n; i++) {
          attributeViewFile = attributeViewFiles[i];
          if (!attributeViewFile.getName().endsWith(".attributeview")) {
            continue;
          }
          attributeViewFileName = attributeViewFile.getName();
          inputSource = getAttributeFileInputSource(attributeViewFile);
          keyColumns = xpathExpression.evaluate(inputSource, NODESET);
          switch (keyColumns.length) {
            case 0:
              print("Attribute view ${attributeViewFileName} does not define a key.");
              break;
            case 1:
              node = keyColumns.item(0);
              keyColumn = node.getAttribute("id")
              value = attributeViewKeys[keyColumn];
              if (typeof(value) === "undefined") {
                attributeViewKeys[keyColumn] = value = [];
              }
              value.push(attributeViewFile);
              break;
            default:
              print("Attribute view ${attributeViewFileName} as a composite key. This is currently not supported.");
              break;
          }
          inputSource.getCharacterStream().close();
        }
      }
      
      var columnCallbacks = {
        beforeAll: function(){
          var tableIterator = this.tableIterator;
          tableIterator.tableColumns = [];
        },
        forEach: function(){
          var row = this.row;

          var tableIterator = this.tableIterator;
          tableIterator.tableColumns.push(row);

          if (tableIterator.isMeasureColumn(row)) {
            return "";
          }

          var schemaName = row.TABLE_SCHEM;
          var tableName = row.TABLE_NAME;
          var columnName = row.COLUMN_NAME;
          var friendlyName = hanaViewGeneratorHelper.getFriendlyName(columnName);

          var isKey = typeof(tableIterator.primaryKeyColumns[columnName]) !== "undefined";
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
      
      var tableIteratorCallbacks = {
        ifNone: function(){
          print("No tables to process.");
        },
        findAttributeViewForKeyColumn: function(tableColumn){
          var columnName, type = typeof(tableColumn);
          switch (type){
            case "object":
              columnName = tableColumn.COLUMN_NAME;
              break;
            case "string":
              columnName = tableColumn;
              break;
            default:
              throw new Error("Invalid type for tableColumn: " + type);
          }
          var attributeViewKeyColumn;
          for (attributeViewKeyColumn in attributeViewKeys) {
            if (columnName.indexOf(attributeViewKeyColumn) === -1) {
              continue;
            }
            return attributeViewKeyColumn;
          }
          return null;
        },
        isPrimaryKeyColumn: function(tableColumn) {
          var columnName = tableColumn.COLUMN_NAME;
          var primaryKeyColumns = this.primaryKeyColumns;
          var primaryKeyColumn = primaryKeyColumns[columnName];
          var type = typeof(primaryKeyColumn);
          return type !== "undefined";
        },
        isDimensionKeyColumn: function(tableColumn){
          var attributeViewKeyColumn = this.findAttributeViewForKeyColumn(tableColumn);
          return attributeViewKeyColumn !== null;
        },
        isMeasureColumn: function(tableColumn) {
          if (this.isPrimaryKeyColumn(tableColumn)) {
            return false;
          }
          if (this.isDimensionKeyColumn(tableColumn)) {
            return false;
          }
          var dataType = tableColumn.DATA_TYPE;
          var SqlType = Java.type("java.sql.Types");
          switch (dataType) {
            case SqlType.BIGINT:
            case SqlType.DECIMAL:
            case SqlType.DOUBLE:
            case SqlType.FLOAT:
            case SqlType.INTEGER:
            case SqlType.NUMERIC:
            case SqlType.REAL:
            case SqlType.SMALLINT:
            case SqlType.TINYINT:
              break;
            default:
              return false;
          }
          return true;
        },
        generateBaseMeasures: function(){
          var tableColumns = this.tableColumns, n = tableColumns.length, tableColumn, i, output = "";
          for (i = 0; i < n; i++) {
            tableColumn = tableColumns[i];
            if (!this.isMeasureColumn(tableColumn)) {
              continue;
            }
            output += this.generateBaseMeasure(tableColumn);
          }
          return output;
        },
        generateBaseMeasure: function(tableColumn){
          var schemaName = tableColumn.TABLE_SCHEM;
          var tableName = tableColumn.TABLE_NAME
          var columnName = tableColumn.COLUMN_NAME;
          var ordinalPosition = tableColumn.ORDINAL_POSITION;
          var friendlyName = hanaViewGeneratorHelper.getFriendlyName(columnName);
          var output = <<EOD

      <measure 
        id="${hanaViewGeneratorHelper.escapeXml(columnName)}" 
        order="${hanaViewGeneratorHelper.escapeXml(ordinalPosition)}" 
        aggregationType="sum" 
        measureType="simple"
      >
        <descriptions 
          defaultDescription="${hanaViewGeneratorHelper.escapeXml(friendlyName)}"
        />
        <measureMapping 
          schemaName="${hanaViewGeneratorHelper.escapeXml(schemaName)}" 
          columnObjectName="${hanaViewGeneratorHelper.escapeXml(tableName)}" 
          columnName="${hanaViewGeneratorHelper.escapeXml(columnName)}"
        />
      </measure>
EOD
          return output;
        },
        generateJoins: function(){
          this.dimensionShapes = "";
          this.joinIndex = 0;

          var tableColumns = this.tableColumns, n = tableColumns.length, tableColumn, i, output = "";
          for (i = 0; i < n; i++) {
            tableColumn = tableColumns[i];
            if (!this.isDimensionKeyColumn(tableColumn)) {
              continue;
            }
            output += this.generateJoin(tableColumn);
          }
          return output;
        },
        generateJoin: function(tableColumn){
          var columnName = tableColumn.COLUMN_NAME;
          var attributeViewKeyColumn = this.findAttributeViewForKeyColumn(tableColumn);
          var attributeView = attributeViewKeys[attributeViewKeyColumn];
          if (attributeView.length > 1) {
            print("Found multiple attribute views matching dimension key column ${columnName} (${attributeView.join(';')}).");
          }
          attributeViewattributeView = attributeView[0];
          var file = attributeViewattributeView.getName();
          var dir = attributeViewattributeView.getParentFile();
          var canonicalPath = dir.getCanonicalPath();
          var token = "__empty__" + File.separator;
          var indexOfEmpty = canonicalPath.indexOf(token);
          if (indexOfEmpty === -1) {
            throw new Error("Cannot make a repository path of " + canonicalPath);
          }
          var viewName = canonicalPath.substr(indexOfEmpty + token.length);
          viewName = viewName.replace(new RegExp("\\" + File.separator, "g"), ".");
          viewName = "/" + viewName + "/attributeviews/" + file.substr(0, file.indexOf(".attributeview"));
          var output = <<EOD
          
      <logicalJoin 
        associatedObjectUri="${hanaViewGeneratorHelper.escapeXml(viewName)}"
      >
        <attributes>
          <attributeRef>#${hanaViewGeneratorHelper.escapeXml(columnName)}</attributeRef>
        </attributes>
        <associatedAttributeNames>
          <attributeName>${hanaViewGeneratorHelper.escapeXml(attributeViewKeyColumn)}</attributeName>
        </associatedAttributeNames>
        <properties 
          joinOperator="Equal" 
          joinType="referential"
        />
        <associatedAttributeFeatures/>
      </logicalJoin>
EOD      
          var dimensionShape = <<EOD

        <shape 
          modelObjectName="${hanaViewGeneratorHelper.escapeXml(viewName)}" 
          modelObjectType="repository"
        >
          <upperLeftCorner x="100" y="${20 + this.joinIndex * 100}"/>
        </shape>
EOD
          this.joinIndex += 1;
          this.dimensionShapes += dimensionShape;
          return output;
        },
        forEach: function(){

          var primaryKeyColumns = {};
          tableIterator.iteratePrimaryKeyColumns({
            forEach: function(){
              var row = this.row;
              primaryKeyColumns[row.COLUMN_NAME] = row;
            }
          });
          this.primaryKeyColumns = primaryKeyColumns;

          var tableName = this.row.TABLE_NAME;
          var id = hanaViewGeneratorHelper.getViewName(tableName);
          var objectName = hanaViewGeneratorHelper.getObjectName(tableName);
          var friendlyName = hanaViewGeneratorHelper.getFriendlyName(objectName);
          var description = friendlyName + " Cube";

          var output = <<EOD
<?xml version="1.0" encoding="UTF-8"?>
<Cube:cube 
  xmlns:Cube="http://www.sap.com/ndb/BiModelCube.ecore" 
  schemaVersion="1.5" 
  id="${hanaViewGeneratorHelper.escapeXml(id)}" 
  applyPrivilegeType="ANALYTIC_PRIVILEGE" 
  checkAnalyticPrivileges="true" 
  defaultClient="$$client$$" 
  defaultLanguage="$$language$$" 
  visibility="reportingEnabled"
>
  <descriptions 
    defaultDescription="${hanaViewGeneratorHelper.escapeXml(description)}"
  />
  <localVariables/>
  <privateMeasureGroup id="MeasureGroup">
    <attributes>
${this.iterateColumns(columnCallbacks)}
    </attributes>
    <calculatedAttributes/>
    <privateDataFoundation>
      <tableProxies>
        <tableProxy centralTable="true">
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
            modelObjectName="${hanaViewGeneratorHelper.escapeXml(tableName)}" 
            modelObjectNameSpace="${hanaViewGeneratorHelper.escapeXml(this.row.TABLE_SCHEM)}" 
            modelObjectType="catalog"
          >
            <upperLeftCorner x="70" y="30"/>
          </shape>
        </shapes>
      </layout>
    </privateDataFoundation>
    <baseMeasures>
${this.generateBaseMeasures()}    
    </baseMeasures>
    <calculatedMeasures/>
    <restrictedMeasures/>
    <sharedDimensions>
${this.generateJoins()}
    </sharedDimensions>
    <layout>
      <shapes>
        <shape modelObjectName="MEASURE_GROUP" modelObjectType="repository">
          <upperLeftCorner x="16" y="234"/>
        </shape>
${this.dimensionShapes}    
        <shape modelObjectName="LogicalView" modelObjectNameSpace="MeasureGroup" modelObjectType="repository">
          <upperLeftCorner x="40" y="85"/>
          <rectangleSize/>
        </shape>
      </shapes>
    </layout>
  </privateMeasureGroup>
</Cube:cube>
EOD          
          var viewName = hanaViewGeneratorHelper.getViewName(this.row.TABLE_NAME);
          var fileName = viewName + ".analyticview";
          hanaViewGeneratorHelper.handleOutput(output, fileName);
          return output;          
        }
      };

      getAttributeViewKeys();
      
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