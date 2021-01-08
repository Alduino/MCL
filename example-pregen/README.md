This is an example of a file generated by the preprocessor, and contains a format that maps directly to
the output Minecraft code. This file is in the standard JSON format. In the future, it might change to use
BJSON, although there isn't a need for that at the moment.

The name of the file is `[original name].g.json`. The `g` stands for 'pregen'. If we switch to BJSON, the
`.json` extension will be removed.

This file is expected to be of the type `PreGen`, specified in `/src/pregen-structure/PreGen.ts`. Function
names must be in the format `namspace:function`, which will be translated to
`[namespace]/functions/[function].mcfunction`. As this file is not meant to be edited by humans, errors will
cause undefined behaviour, and may fail silently.

Specifically, this file would generate something like:

```minecraft
// namespace/functions/function.mcfunction
/tp @s[distance=..5,score={testScoreboard=10..20},advancements={story/form_obsidian=true,story/obtain_armor={iron_helmet=true},nbt=!{OnGround:true,StringArgument:{id:"minecraft:slime_ball"},Tags:[a,b],Color:0b}] 100 ~200 ^300
```

Some trivia: As MCL was built upwards from the output to the language, this was the first step. The JSON
file in this directory was used as a test for the output stage.