type tActionName = 'position' | 'rotation' | 'scale'
type xyz = { x: number, y: number, z: number }
interface iAction {
    name: tActionName,
    target:i3DObject,
    offset: number | [number, number]
}
interface iUserData {
    id: string,
    name?: string,
    obj: string,
    type: string,
    origin: [number, number],
    alt?: number,
    rotation: xyz,
    scale: number | xyz,
    castShadow: boolean,
    units: string,
    anchor: string,
    class: {
        transformable: boolean,
    }
    handler?: CallableFunction
}
interface i3DObject {
    coordinates: [number, number, number],
    setCoords: CallableFunction,
    model: {
        scale: xyz,
        rotation: xyz,
    },
    userData: iUserData,
    wireframe: boolean,
    selected: boolean,
    addTooltip: CallableFunction,
    removeTooltip: CallableFunction,
}

class ActionStack {
    private _stack: iAction[] = []
    private _idx:number=-1
}

export type { tActionName, xyz, iAction, i3DObject, iUserData }