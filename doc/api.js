YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "Args",
        "Global",
        "JDBC",
        "JDBCConnectionProperties",
        "ResultsetIterator",
        "ResultsetIteratorCallbacks",
        "TabeIteratorFactory",
        "TableIteratorCallbacks",
        "TableIteratorSample"
    ],
    "modules": [
        "Args",
        "TabeIterator",
        "jdbc",
        "jjsml",
        "resultsetIterator"
    ],
    "allModules": [
        {
            "displayName": "Args",
            "name": "Args",
            "description": "Commandline arguments for jjs. jjs accepts user arguments after the -- on its commandline.\n This module provides functionality to define, document, parse, and prompt for jjs arguments\n specified as &lt;name&gt;=&lt;value&gt; pairs.\nTypically you would acquire this module by naming it as a dependency to a call to `define()` when defining a user module.\n The object passed to the `define()` callback to represent the dependency can be treated as a singleton `Args` class,\n which exposes all functonality to work with arguments as static methods."
        },
        {
            "displayName": "jdbc",
            "name": "jdbc",
            "description": "The jdbc module provides access to java database connectivity (JDBC).\nTypically you acquire access to the module by naming it as a dependency in a call to `define()` \nwhen defining your own module.\nThe object passed to the `define()` callback to represent the dependency can be considered \na singleton `jdbc` class, which exposes all its functionality as static methods."
        },
        {
            "displayName": "jjsml",
            "name": "jjsml",
            "description": "A module loader for jjs, the javascript shell based on Nashorn that ships with Oracle JDK 1.8.\n\nThe shell comes with built-in functions to load external scripts (and files).\nUnfortunately, it does not come with support for module and dependency loading.\nAlso, dealing with relative paths is a challenge, since jjs resolves those\nwith respect to the program working directory (that is, the dir from whence jjs was run).\n\nThe jjsml module tries to provide a solution for these problems.\n\nThe jjsml module exports a single global `define()` function \nwhich can be used to define and load modules, and to load their dependencies.\nIn addition, the jjsml module detects whether a main module was specified through the\n`jjsml.main.module` java System property.\nWhen specified, this module will be loaded automatically, acting as an entrypoint."
        },
        {
            "displayName": "resultsetIterator",
            "name": "resultsetIterator"
        },
        {
            "displayName": "TabeIterator",
            "name": "TabeIterator"
        }
    ],
    "elements": []
} };
});