(function(){
    define("../../src/args/args.js", function(args){
    
      //1) use args.define() to pass one or more argDef objects
      args.define({     
        name: "arg1",                                         //name property is used for name in a &lt;name&gt;=&lt;value&gt; pair
        help: "This is arg1 for this command line utility.",  //help is used to provide users with a clue on what value to enter
        value: "Hello",                                       //value may be used to specify a default value
        parse: function(value){                               //parse() may be specified to validate and convert value 
          //code to convert string value from default value or passed on the command line to appropriate internal argument value 
          return value;
        }
      }, {
        name: "arg2",
        help: "This is arg2 for this command line utility.",
        mandatory: true                                       //mandatory stipulates that this argument is mandatory
      });

      //2) use args.init() to parse and validate arguments passed on the command line.
      args.init();

      //3) if necessary use args.show() to print all arguments along with their help text
      //(in this case: "necessary" is when no arguments where specified)
      if ($ARG.length === 0){
        args.show();
        exit();
      }

      //4) for those mandatory arguments that do not have received a value, prompt the user.
      args.prompt();

      //5) use args.get(&lt;name&gt;) to get the value of an argument and use it in your script.
      var arg1 = args.get("arg1");
      print(arg1);

      var arg2 = args.get("arg2");
      print(arg2);
    });
})()
