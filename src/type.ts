type TActionName = 'position' | 'rotation' | 'scale' | 'remove' | 'create'
type xyz = { x: number, y: number, z: number }
interface IAction {
	name: TActionName,
	target: I3DObject,
	offset: number | [number, number]
	timestamp: number
}
interface IUserData {
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
interface I3DObject {
	coordinates: [number, number, number],
	setCoords: CallableFunction,
	model: {
		scale: xyz,
		rotation: xyz,
	},
	userData: IUserData,
	wireframe: boolean,
	selected: boolean,
	addTooltip: CallableFunction,
	removeTooltip: CallableFunction,
	visible: boolean,
	raycasted: boolean,
}

export type { TActionName, xyz, IAction, I3DObject, IUserData }