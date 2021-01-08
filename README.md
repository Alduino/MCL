No proper documentation yet, this is still very much in its early stages.

## Progress

- [x] **Stage 1**: Language parser - parses the MCL language and generates a JSON file for the preprocessor *working 
  for example*
- [ ] **Stage 2**: Preprocessor - processes the resulting JSON file into the pregen JSON file.
  - [x] Functions and blocks
    - [ ] Parameters and return values
    - [ ] Return values
    - [ ] Stack? Maybe not possible
  - [x] Conditionals
  - [x] Variables - based on scoreboards
    - [x] Selectors
    - [x] Maths
    - [ ] Coordinates
    - [ ] Decimals (most likely fixed-point, not sure if floats are possible)
    - [ ] Assign from return value of function
- [x] **Stage 3**: Compiler - Generates Minecraft function files from the pregen JSON file. *only mostly done*
