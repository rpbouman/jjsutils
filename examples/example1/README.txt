The Problem: Dynamically Loading Script resources with jjs
==========================================================
This example illustrates a challenge script authors have to overcome when dynamically loading other scripts with jjs.

In this example we have myScript.js, and its contents are:

    load("myOtherScript.js");

So, myScript.js has a dependency on myOtherScript.js, because it tries to dynamically load it.
The contents of myOtherScript.js are:

    print("Hello jjs!");

myScript.js is meant to be executed directly through the jjs command line, and myOtherScript.js represents
some functionality that can potentially be re-used in other scripts.

Assuming the current working directory is the example1 directory, we can run myScript.js with this command:

    jjs -scripting myScript.js

If all goes well, then myOtherScript.js will be loaded and immediately evaluated. The output is:

    Hello, jjs!

Now suppose we would change the working directoy and move one directory up to examples. 
Obviously, we would need to modify our command to reflect the location of myScript.js, 
relative to the current working directory. But when we now execute:

    jjs -scripting example1/myScript.js

the output is:

example1/myScript.js:1 TypeError: Cannot load script from myOtherScript.js

Apparently, the relative location passed to the built-in `load()` function is resolved 
against the current working directory and not the location of the script that calls the `load()` function.

How to avoid the Problem
========================
Without any additional means, there are only two things we can do to remedy this problem:
1) Don't use any relative paths ever - only use absolute paths as argument for `load()`.
2) Accept that we must ensure the correct working directoy prior before executing myScript.js

Clearly both these solutions are troublesome.

Option 1 - don't use relative paths - essentially means that the location for our scripts must be fixed for ever. 
For example, we can't keep multiple copies of our scripts on the same system since the there is only one location 
where any given script is located.

Option 2 - ensure the correct working directory - means that we need to have some method external to our scripts 
that can determine the currect working directory.

I think it's clear that both "solutions" have a severe negative impact on the portability of our scripts.

For a solution that is possibly a bit better, go to example2.