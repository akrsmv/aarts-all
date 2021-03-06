
export const uuid = (): string => {
    let uuidValue = "", k, randomValue;
    for (k = 0; k < 32; k++) {
        randomValue = Math.random() * 16 | 0;

        if (k == 8 || k == 12 || k == 16 || k == 20) {
            uuidValue += "-"
        }
        uuidValue += (k == 12 ? 4 : (k == 16 ? (randomValue & 3 | 8) : randomValue)).toString(16);
    }
    return uuidValue;
}

export const chunks = <T>(arr: Array<T>, size: number): Array<Array<T>> => {
    if (!Array.isArray(arr)) return [[arr]]
    const chunked_arr = [];
    let index = 0;
    while (index < arr.length) {
        chunked_arr.push(arr.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
}

export const ppjson = (obj: any): string => {
    if (obj instanceof Error) {
        return JSON.stringify(obj, replaceErrors, 4)
    } else if (obj instanceof Map) {
        return JSON.stringify(obj, replaceMap, 4)
    } else {
        return typeof obj === "object" ?
            JSON.stringify(obj, null, 4) : 
            obj as unknown as string
    } 
}

const replaceErrors = (key: string, value: any) => {
    if (value instanceof Error) {
        var error : Record<string, any> = {};

        Object.getOwnPropertyNames(value).forEach(function (key) {
            //@ts-ignore
            error[key] = value[key];
        });

        return error;
    }

    return value;
}

const replaceMap = (key: string, value: any) => {
    if (value instanceof Map) {
        return Array.from(value.entries())
    }
    return value;
}

export type RingTokenSource = { ringToken: string }
/**
 * utilty method for logging which reminds the developer to always pass the ringToken
 * for easy tracking the source of that log message
 * @param message 
 * @param obj 
 */
export const loginfo = (ringTokenObject: RingTokenSource, ...input: string[]) => {
    console.log(ringTokenObject.ringToken, input)
}

export const versionString = (nr: number) => `v_${nr}`

/**
 * either the object {id, meta} or the string id#meta
 */
export type IncommingPK = string | {id: string, meta: string}

export const existingPK = (input: IncommingPK) : {id: string, meta: string} => {
    if (!input) {
        throw new Error("unknown input for making PK");
    }
    if (typeof input === 'string') {
        const refsplit = input.split('#')
        const id = refsplit[0]
        const meta = refsplit.length === 2 && !!refsplit[1] ? refsplit[1] : `${versionString(0)}|${id}`
        return { id, meta }
    } else if (typeof input === "object" && !!input.id && !!input.meta) {
        return { id: input.id, meta: input.meta}
    } else {
        throw new Error("unknown input for making PK");
    }
}

export const newPK = (__type: string) : {id: string, meta: string} => {
    const i: string = uuid()
    return {
        id: `${__type}|${i}`, meta: `${versionString(0)}|${__type}|${i}`
    }
}