import {bgGreen, bgRed, blue, green, grey, red, reset, white, yellow} from "chalk";

type Constructor<T> = {new(...args: any[]): T};

function getKeys<T>(clazz: Constructor<T>): (keyof T)[] {
    try {
        const instance = new clazz();
        return Object.keys(instance) as (keyof T)[];
    } catch {
        return [];
    }
}

function getAutoValues<T>(clazz: Constructor<T>): T {
    try {
        return new clazz();
    } catch {
        return null;
    }
}

function keyExistsIn<T>(clazz: Constructor<T>, key: string): boolean {
    return getKeys(clazz).includes(key as keyof T);
}

function getMissingKeys<T>(clazz: Constructor<T>, keys: (keyof T)[]) {
    const ks = getKeys(clazz);
    const autoValues = getAutoValues(clazz);

    const requiredKeys = isElliRequiredKeys(autoValues) ? autoValues._elliRequiredKeys : ks;

    return ks.filter(k => !keys.includes(k)).filter(k => requiredKeys.includes(k));
}

function isElliRequiredKeys(t: any): t is ElliRequiredKeys<any> {
    return "_elliRequiredKeys" in t;
}

export default function logLoad<T>(clazz: Constructor<T>, src: T) {
    if (!process.env.LOG_LOAD) return;

    const missingKeys = getMissingKeys(clazz, Object.keys(src) as (keyof T)[]);
    const missingKeysMessage = missingKeys.length > 0 ? (
        "- Missing: " + missingKeys.map(k => yellow(k)).join(reset(", "))
    ) : "";

    console.debug(
        white(missingKeys.length > 0 ? bgRed(" ☒ ") : bgGreen(" ☑ ")),
        grey("Import"),
        green(clazz.name),
        grey("from"),
        Object.entries(src).map(([key, val]) =>
            `${keyExistsIn(clazz, key) ? yellow(key) : red(key)}:${blue(JSON.stringify(val))}`).join(grey(", ")),
        missingKeysMessage);
}

export interface ElliRequiredKeys<T> {
    _elliRequiredKeys: (keyof T)[];
}
