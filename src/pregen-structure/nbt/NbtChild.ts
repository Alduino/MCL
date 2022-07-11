import NbtObject, {loadNbtObject, NbtObjectLike} from "./NbtObject";
import NbtString, {loadNbtString, NbtStringLike} from "./NbtString";
import NbtNumber, {loadNbtNumber, NbtNumberLike} from "./NbtNumber";
import NbtBool, {loadNbtBool, NbtBoolLike} from "./NbtBool";
import NbtArray, {loadNbtArray, NbtArrayLike} from "./NbtArray";

// TODO: Byte/Int/Long Array

export type NbtChildLike = NbtObjectLike | NbtArrayLike | NbtStringLike | NbtNumberLike | NbtBoolLike;

type NbtChild = NbtObject | NbtArray | NbtString | NbtNumber | NbtBool;
export default NbtChild;

export function loadNbtChild(src: NbtChildLike): NbtChild {
    switch (src.type) {
        case "nbt.object":
            return loadNbtObject(src);
        case "nbt.string":
            return loadNbtString(src);
        case "nbt.number":
            return loadNbtNumber(src);
        case "nbt.bool":
            return loadNbtBool(src);
        case "nbt.array":
            return loadNbtArray(src);
        default:
            throw new ReferenceError(`Invalid NBT child, ${JSON.stringify(src)}`);
    }
}
