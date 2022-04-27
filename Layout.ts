import { i3DObject, iUserData, tActionName } from "./ActionStack"

class Layout {
    private _target: i3DObject | null = null
    private _action: tActionName='position'
    private _offset: { [key: string]: number } = {
        position: 0.001,
        scale: 1,
        rotation: 1,
    }
    private _multiplier: number = 1
    private _dashboard: HTMLDivElement = document.createElement('div')
    private _saveFn?: (target: Object) => void

    private _keyDownEventListener = (e: KeyboardEvent) => {
        if (Layout.preventDefaultList.includes(e.key)) e.preventDefault()
        switch (e.key) {
            //변형할 프로퍼티 선택
            case 't':
                this._action = 'position'
                this._multiplier = 1
                break
            case 'y':
                this._action = 'scale'
                this._multiplier = 1
                break
            case 'r':
                this._action = 'rotation'
                this._multiplier = 1
                break

            //방향키로 변형 실행
            case 'ArrowUp':
                this._updown(false)
                break
            case 'ArrowDown':
                this._updown(true)
                break
            case 'ArrowLeft':
                this._leftright(true)
                break
            case 'ArrowRight':
                this._leftright(false)
                break

            //변형 정도 선택
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                this._multiplier = Number(e.key)
                break

            //저장
            case 's':
                if(e.ctrlKey){
                    this.save()
                }

            //현재 데이터 직렬화해서 출력
            case 'p':
                this.print()
                break

            //취소
            case 'q':
                if (this._target)
                    this._target!.selected = false
                //     this._target!.wireframe = false
                this.target = null
                break
        }

        this._updateDashboard()
    }

    /** e.preventDefault()의 발동조건 */
    static preventDefaultList: string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 's']

    constructor() {
        this._dashboard.style.backgroundColor = 'white'
        this._dashboard.style.setProperty('width', '256px')
        this._dashboard.style.setProperty('height', '144px')
        document.getElementsByClassName('mapboxgl-ctrl-bottom-right')[0].appendChild(this._dashboard)
    }
    private _updown(down: boolean) {
        let offset = (down ? -1 : 1) * this._offset[this._action] * this._multiplier

        if (this._action === `scale`) {
            this._scale(offset)
        }
        else if (this._action === `position`) {
            this._translatePosition(0, offset)
        }
    }
    private _leftright(left: boolean) {
        let offset = (left ? -1 : 1) * this._offset[this._action] * this._multiplier
        if (this._action === `position`) {
            this._translatePosition(offset, 0)
        }
        else if (this._action === `rotation`) {
            this._rotate(offset)
        }
    }

    set offset(num: number) { this._offset[this._action] = num }
    get offset() { return this._offset[this._action] }

    set target(tgt: i3DObject | null) {
        this.setTarget(tgt)
    }
    public setTarget(tgt: i3DObject | null) {
        this._target = tgt
        //console.log(`target set: `, this._target?.userData?.name || this._target)

        if (this._target) {
            window.addEventListener('keydown', this._keyDownEventListener)
        }
        else {
            window.removeEventListener('keydown', this._keyDownEventListener)
        }

        this._updateDashboard(!tgt)
    }

    private _scale(offset: number) {
        if (!this._isTargetSet()) return
        this._target!.model.scale.x += offset
        this._target!.model.scale.y += offset
        this._target!.model.scale.z += offset
    }
    private _rotate(offset: number) {
        if (!this._isTargetSet()) return
        this._target!.model.rotation.y += offset * Math.PI / 180
    }
    private _translatePosition(offsetLng: number, offsetLat: number) {
        if (!this._isTargetSet()) return
        const [lng, lat] = this._target!.coordinates
        this._target!.setCoords([lng + offsetLng, lat + offsetLat])
    }

    private _isTargetSet(tell = false): boolean {
        if (!this._target) {
            if (tell)
                console.log(`target set: `, this._target)
            return false
        }
        else return true
    }

    private _updateDashboard(init?: boolean) {
        if (init) {
            this._dashboard.innerHTML = ''
            return
        }
        if (!this._isTargetSet(false)) return
        this._dashboard.innerHTML = `
        <style> .${this._action} {background-color:yellow;} </style>

        <div>대상: ${this._target!.userData.name}</div>
        <div class='rotation'>회전(R ↔): ${Math.floor(this._target!.model.rotation.y * 180 / Math.PI) % 360}도</div>
        <div class='position'>좌표(T ✥): ${this._target!.coordinates.slice(0, 2).map(i => i.toFixed(4))}</div>
        <div class='scale'>스케일(Y ↕): ${(this._target!.model.scale.x === this._target!.model.scale.y && this._target!.model.scale.y === this._target!.model.scale.z) ? this._target!.model.scale.z : this._target!.model.scale}</div>
        <div>오프셋(1~9): ${(this._offset[this._action] * this._multiplier).toFixed(3)}</div><br />
        <div>선택 취소(q) &nbsp;속성 출력(p)</div>
        `
    }

    private _toJSON(): Object {
        if (!this._isTargetSet()) return {}
        const output: iUserData = {
            id: this._target!.userData.id,
            name: this._target!.userData.name ?? '이름없음',
            obj: this._target!.userData.obj,
            class: this._target!.userData.class,
            type: this._target!.userData.type,
            origin: [this._target!.coordinates[0], this._target!.coordinates[1]],
            alt: this._target!.coordinates[2] ?? 0,
            scale: (this._target!.model.scale.x === this._target!.model.scale.y && this._target!.model.scale.y === this._target!.model.scale.z) ? this._target!.model.scale.z : this._target!.model.scale,
            rotation: { x: this._target!.model.rotation.x * 180 / Math.PI, y: this._target!.model.rotation.y * 180 / Math.PI, z: this._target!.model.rotation.z * 180 / Math.PI },
            castShadow: this._target!.userData.castShadow,
            units: this._target!.userData.units,
            anchor: this._target!.userData.anchor,
        }
        return output
    }
    public print(): string {
        const outString: string = JSON.stringify(this._toJSON())
        console.log(outString)
        return outString
    }
    public setSaveFn(saveFn: (target: Object) => Promise<any>, onSuccess:()=>{}, onFailure:(err:Error)=>{}){
        if(saveFn)
            this._saveFn=(target)=>{saveFn(target).then(onSuccess).catch(onFailure)}       
    }
    public save(): Promise<any> {
        if (!this._saveFn) return new Promise((res, rej) => { rej(new Error(`Save function not set`)) })
        if (!this._isTargetSet()) return new Promise((res, rej) => { rej(new Error(`Target ${this._target} is unable to save`)) })
        return new Promise((res, rej) => {
            return this._saveFn!(this._toJSON())
        })
    }
}

export { Layout }
