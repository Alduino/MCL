import Coordinate, {CoordinateLike} from "./coord/Coordinate";
import Selector, {SelectorLike} from "./selector/Selector";
import Nbt, {NbtLike} from "./nbt/Nbt";
import Item, {ItemLike} from "./item/Item";
import {Command, CommandLike, Comment, CommentLike} from "./PreGen";

type Argument = Coordinate | Selector | Nbt | Item | Command | Comment;
export default Argument;

export type ArgumentLike = CoordinateLike | SelectorLike | NbtLike | ItemLike | CommandLike | CommentLike;
