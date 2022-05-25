import { ActionStack } from "./ActionStack"
import { Difference } from "./Diff"
import { I3DObject, IAction, IUserData, TActionName } from "./type"

class Editor {
    private _enabled = false
    private _record = new ActionStack(this)
    private _diff = new Difference()
    private _target: I3DObject | null = null
    private _action: TActionName = 'position'
    private _offset: { [key: string]: number } = {
        position: 0.001,
        scale: 1,
        rotation: 1,
    }
    private _multiplier: number = 1
    private _notifier: (msg: string, type?: string) => void = (msg) => console.log(msg)
    private _editorEnabledEventListener = (e: KeyboardEvent) => {
        if (Editor.preventDefaultList.includes(e.key)) e.preventDefault()
        switch (e.key) {
            //저장
            case 's':
                if (e.ctrlKey) {
                    this.save()
                }
                break;

            //Undo, Redo
            case 'z':
                if (e.ctrlKey) {
                    if (!e.shiftKey) {
                        this._record.undo()
                    }
                }
                break
            case 'Z':
                if (e.ctrlKey) {
                    if (e.shiftKey) {
                        this._record.redo()
                    }
                }
                break
        }
        this._updateDashboard()
    }
    private _modelSelectedEventListener = (e: KeyboardEvent) => {
        if (Editor.preventDefaultList.includes(e.key)) e.preventDefault()
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

            //제거
            case 'm':
                if (e.ctrlKey) {
                    this._remove()
                }

            // //현재 데이터 직렬화해서 출력
            // case 'p':
            //     this.print()
            //     break

            //취소
            case 'q':
                if (this._target)
                    this._target!.selected = false
                this.target = null
                break
        }
        this._updateDashboard()
    }

    /** e.preventDefault()의 발동조건 */
    static preventDefaultList: string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 's', 'm']

    constructor() {
        this.setEnabledStatus(this._enabled)
        this._updateDashboard()
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

    public setEnabledStatus(enabled: boolean) {
        this._enabled = enabled
        if (this._enabled) window.addEventListener('keydown', this._editorEnabledEventListener)
        else window.removeEventListener('keydown', this._editorEnabledEventListener)
    }

    set offset(num: number) { this._offset[this._action] = num }
    get offset() { return this._offset[this._action] }

    set target(tgt: I3DObject | null) {
        this.setTarget(tgt)
    }
    public setTarget(tgt: I3DObject | null) {
        this._target = tgt
        if (this._enabled && this._target) {
            //diff에 등록하여 변화하고 있는 오브젝트임을 기억한다
            this._diff.enlist(this._target)
            //키보드 입력으로 에디팅을 활성화사킨다
            window.addEventListener('keydown', this._modelSelectedEventListener)
        }
        else {
            window.removeEventListener('keydown', this._modelSelectedEventListener)
        }

        this._updateDashboard()
    }

    /**
     * @param trace record에 저장할지 말지 정하는 것 - Undo, Redo할 때에는 false로 해야함
     */
    private _scale(offset: number, trace = true) {
        if (!this._isTargetSet()) return

        if (trace)
            this._record.push({ name: this._action, target: this._target!, offset: offset, timestamp: new Date().getTime() })

        this._target!.model.scale.x += offset
        this._target!.model.scale.y += offset
        this._target!.model.scale.z += offset
    }
    private _rotate(offset: number, trace = true) {
        if (!this._isTargetSet()) return

        if (trace)
            this._record.push({ name: this._action, target: this._target!, offset: offset, timestamp: new Date().getTime() })

        this._target!.model.rotation.y += offset * Math.PI / 180
    }
    private _translatePosition(offsetLng: number, offsetLat: number, trace = true) {
        if (!this._isTargetSet()) return

        if (trace)
            this._record.push({ name: this._action, target: this._target!, offset: [offsetLng, offsetLat], timestamp: new Date().getTime() })
        // this._diff.edit(this._target?.userData.id, {pos, rot, })

        const [lng, lat] = this._target!.coordinates
        this._target!.setCoords([lng + offsetLng, lat + offsetLat])
    }

    public applyAction(act: IAction) {
        this.setTarget(act.target)
        switch (act.name) {
            case "remove":
                this._remove(act.offset as number, false)
                break
            case "create":
                this._remove(-(act.offset as number), false)
                break
            case "position":
                const [lng, lat] = act.offset as [number, number]
                this._translatePosition(lng, lat, false)
                break
            case "rotation":
                this._rotate(act.offset as number, false)
                break
            case "scale":
                this._scale(act.offset as number, false)
                break
        }
    }

    /**
     * @param tell 콘솔에 어떤 타켓이 설정됐는지 보여줄지 말지
     * @returns 타켓이 설정됐는지 아닌지 여부
     */
    private _isTargetSet(tell = false): boolean {
        if (!this._target) {
            if (tell)
                console.log(`target set: `, this._target)
            return false
        }
        else return true
    }

    private _updateDashboard() {
        console.clear()
        if (!this._isTargetSet(false)) {
            console.log(`대상이 없습니다`)
        }
        else {
            console.log(`대상: ${this._target!.userData.name}`)
            console.log(`%c회전(R ↔): ${Math.floor(this._target!.model.rotation.y * 180 / Math.PI) % 360}도`, this._action === 'rotation' ? 'background-color:yellow;' : '')
            console.log(`%c좌표(T ✥): ${this._target!.coordinates.slice(0, 2).map(i => i.toFixed(4))}`, this._action === 'position' ? 'background-color:yellow;' : '')
            console.log(`%c스케일(Y ↕): ${(this._target!.model.scale.x === this._target!.model.scale.y && this._target!.model.scale.y === this._target!.model.scale.z) ? this._target!.model.scale.z : this._target!.model.scale}`, this._action === 'scale' ? 'background-color:yellow;' : '')
            console.log(`오프셋(1~9): ${(this._offset[this._action] * this._multiplier).toFixed(3)}`)
        }
        this._record.console()
        this.help()
    }

    // private _toJSON(): Object {
    //     if (!this._isTargetSet()) return {}
    //     const output: IUserData = {
    //         id: this._target!.userData.id,
    //         name: this._target!.userData.name ?? '이름없음',
    //         obj: this._target!.userData.obj,
    //         class: this._target!.userData.class,
    //         type: this._target!.userData.type,
    //         origin: [this._target!.coordinates[0], this._target!.coordinates[1]],
    //         alt: this._target!.coordinates[2] ?? 0,
    //         scale: (this._target!.model.scale.x === this._target!.model.scale.y && this._target!.model.scale.y === this._target!.model.scale.z) ? this._target!.model.scale.z : this._target!.model.scale,
    //         rotation: { x: this._target!.model.rotation.x * 180 / Math.PI, y: this._target!.model.rotation.y * 180 / Math.PI, z: this._target!.model.rotation.z * 180 / Math.PI },
    //         castShadow: this._target!.userData.castShadow,
    //         units: this._target!.userData.units,
    //         anchor: this._target!.userData.anchor,
    //     }
    //     return output
    // }
    // public print(): string {
    //     const outString: string = JSON.stringify(this._toJSON())
    //     console.log(outString)
    //     return outString
    // }

    public setSaveLoadFn(downloadFn: () => Promise<IUserData[]>, uploadFn: (data: IUserData[]) => Promise<void | Error>) {
        this._diff.setSaveLoadFn(downloadFn, uploadFn)
    }
    public save() {
        this._diff.save()
    }
    
    public setNotifier(noti: (msg: string, type?: string | undefined) => void) {
        this._notifier = noti
        this._diff.setNotifier(noti)
    }

    /**
     * @param offset 1 to remove, -1 to recover(for undo)
     * @param trace record에 저장할지 말지 정하는 것 - Undo, Redo할 때에는 false로 해야함
     */
    private _remove(offset: number = 1, trace = true) {
        if (!this._isTargetSet()) {
            this._notifier(`Target ${this._target} is unable to delete`, 'warning')
            return
        }

        if (trace)
            this._record.push({ name: 'remove', target: this._target!, offset: offset, timestamp: new Date().getTime() })

        if (offset === 1) {
            this._diff.remove(this._target!.userData.id)
            this._target!.visible = false
            this._target!.raycasted = false
            this.setTarget(null)
        }
        else {
            this._diff.undoRemove(this._target!.userData.id)
            this._target!.visible = true
            this._target!.raycasted = true
        }
    }
    public create(model: I3DObject) {
        this.setTarget(model)
        this._record.push({ name: 'create', target: this._target!, offset: 1, timestamp: new Date().getTime() })
    }

    public help() {
        console.info(`
회전(R ↔) 좌표(T ✥) 스케일(Y ↕)
오프셋 설정(1~9)
저장(ctl+s) 선택 취소(q)
생성(메뉴→🧊) 삭제(ctl+m)
실행 취소(ctl+z) 다시 실행(ctl+shift+z)
        `)
    }
}

export { Editor }

/**
 * # 생성과 삭제 테스트 메모
 * 1. 생성하고 저장하기 
 *      > 저장하면 두개가 됨
 * 		> created를 저장했던 배열은 쓸모가 없길래 제거
 *      > 통과
 * 2. 1번 지우고 저장하기
 *      > userData는 readonly라면서 에러
 *      > 갑자기 통과
 * 3. 생성하고 삭제하고 저장하기
 * 		> 통과
 * 4. 생성하고 언두하고 저장하기
 * 		> 통과
 * 5. 생성하고 언두하고 리두하고 저장하기
 * 		> 통과
 * 6. 5번 삭제하고 언두하고 저장하기
 * 		> 통과
 * 7. 6번 삭제하고 언두하고 리두하고 저장하기
 * 		> 통과
 * 8. 6개 생성하고 0, 2, 4번 삭제하고 저장하기
 * 		> 통과
 * 9. 8에서 남아있는 1,3,5 모두 삭제하고 2번 언두하고 1번 리두하기(5만 살도록)
 * 		> userData는 readonly라면서 에러
 * 		> userData 객체 복사본을 만들어 배열에 저장하고 그것을 서버에 올리도록 함
 * 		> 통과
 */