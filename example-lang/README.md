The `*.a.json` file is the intermediate step between parsing and the preprocessor. The `a` stands for
"Abstract Syntax Tree", which is a simplified output from the parser (the parser generates lots of
unnecessary depth, the `.a.json` file has that removed).

The `example.a.json` file was generated directly from `example.mcl`. This example file was used to design
the MCL language and its parser. You can see the grammar in `/src/parser/lang.peg`. It uses tsPEG to
generate the parser.

(The `example.g.json` file is the result of putting the `example.a.json` through the current version of the 
preprocessor)
