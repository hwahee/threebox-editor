import { Editor } from "."
import { IAction } from "./type"

class ActionStack {
	static THRESHOLD = 100

	private _master: Editor
	private _stack: IAction[] = []
	private _idx: number = -1

	constructor(master: Editor) {
		this._master = master
	}

	public push(act: IAction) {
		const last = this._stack[this._idx]
		if (['position', 'rotation', 'scale'].includes(act.name)		//값 조정에 해당하고
			&& this._idx !== -1											//맨 처음 살행한 동작이 아니고
			&& act.timestamp - last.timestamp < ActionStack.THRESHOLD	//입력 간격이 역치보다 짧고
			&& act.name === last.name									//앞의 동작이랑 똑같은걸 했고
			&& act.target === last.target) {							//같은 타겟에다가 했다면
			if (act.name === "position") {
				(last.offset as [number, number])[0] += (act.offset as [number, number])[0];
				(last.offset as [number, number])[1] += (act.offset as [number, number])[1]
			}
			else {
				(last.offset as number) += (act.offset as number)
			}
			last.timestamp = act.timestamp
		}
		else {
			this._idx++
			this._stack[this._idx] = act
		}
		if (this._idx + 1 !== this._stack.length) {
			this._stack = this._stack.slice(0, this._idx + 1)
		}
	}
	/**
	 * 동작을 되돌리는 기능  
	 * @param master ActionStack을 소유하고 있는 에디터 자신
	 */
	public undo() {
		if (this._idx < 0 || !this._stack[this._idx]) return

		const act: IAction = {
			name: this._stack[this._idx].name,
			offset: null!,
			target: this._stack[this._idx].target,
			timestamp: this._stack[this._idx].timestamp,
		}
		if (act.name === "position") {
			act.offset = [-(this._stack[this._idx].offset as [number, number])[0], -(this._stack[this._idx].offset as [number, number])[1]]
		}
		else {
			act.offset = (-this._stack[this._idx].offset as number)
		}
		this._master.applyAction(act)
		this._idx--
	}
	public redo() {
		if (!(this._stack[this._idx + 1])) return

		this._idx++
		this._master.applyAction(this._stack[this._idx])
	}

	public console() {
		console.log(`%c======= STACK =======`,this._idx === -1 ? 'background-color:skyblue;' : ' ')
		// console.log(`index: ${this._idx}`)
		for (let i = 0; i < this._stack.length; i++) {
			if (['create', 'remove'].includes(this._stack[i].name))
				console.log(`%c${this._stack[i].name} ${this._stack[i].target.userData.name}`, this._idx === i ? 'background-color:skyblue;' : ' ')
			else
				console.log(`%c${this._stack[i].name} ${this._stack[i].offset.toLocaleString()}`, this._idx === i ? 'background-color:skyblue' : ' ')
		}
	}
}

export { ActionStack }