import { I3DObject, IUserData } from "./type";

class Difference {
    private _idList: { [key: string]: I3DObject } = {}
    private _deleted: { [key: string]: boolean } = {}

    private _downloadFn?: () => Promise<IUserData[]>
    private _uploadFn?: (data: IUserData[]) => Promise<void | Error>
    private _notifier: (msg: string, type?: string) => void = (msg) => console.log(msg)

    /**
     * 저장하기 기능을 사용하기 위해 
     */
    public setSaveLoadFn(down: () => Promise<IUserData[]>, up: (data: IUserData[]) => Promise<void | Error>) {
        this._downloadFn = down
        this._uploadFn = up
    }
    public setNotifier(noti: (msg: string, type?: string) => void) {
        this._notifier = noti
    }

    public enlist(tgt: I3DObject) {
        if (this.isInList(tgt.userData.id)) return
        this._idList[tgt.userData.id] = tgt
    }
    public isInList(id: string) {
        return !!this._idList[id]
    }
    public remove(id: string) {
        this._deleted[id] = true
    }
    public undoRemove(id: string) {
        delete this._deleted[id]
    }

    public async save() {
        /// 1. 원래 자료를 가져온다
        /// 2. 변경된 자료들의 useData는 수정되지 않았으므로 그것을 모두 업데이트한다
        /// 3. 변경된 자료의 id들을 원 자료에서 찾는다
        /// 4. 해당 자료를 에디터에 있는(수정된) 데이터로 교체한다
        ///     4-1. 삭제 목록에 있는 id들을 원래 자료에서 삭제한다
        ///     4-2. 생성 목록에 있는 id의 데이터들을 에디터에서 가져와서 원래 자료에 추가한다
        /// 5. 업데이트한다

        try {
            if (!this._downloadFn) throw new Error('Data Download Fn Not Defined')
            if (!this._uploadFn) throw new Error('Data Upload Fn Not Defined')


            // const original = await getContent('models') as IUserData[]
            const original = await this._downloadFn() as IUserData[]
            if (!original.length) throw new Error('Got No Contents')

            ///remove 된 것을 지운다
            Object.keys(this._deleted).forEach(i => {
                if (this._idList[i]) delete this._idList[i]
            })
            ///userData들을 업데이트한다
            const userDataList: IUserData[] = []
            Object.values(this._idList).forEach((i) => {
                userDataList.push({
                    ...i.userData,
                    origin: i.coordinates.slice(0, 2) as [number, number],
                    rotation: { x: i.userData.rotation.x, y: Math.floor(i.model.rotation.y * 180 / Math.PI) % 360, z: i.userData.rotation.z },
                    scale: i.model.scale.z
                })
            })

            //수정된것과 삭제된것 지우기
            const edited = original.filter(i => !this._idList[i.id]).filter(i => !this._deleted[i.id])
            //수정된것 채워넣기 (delete된 것이 잇으면 안됨)
            edited.push(...userDataList)

            // const res = await uploadContent('models', edited)
            const res = await this._uploadFn(edited)

            this._notifier('upload complete')
        }
        catch (err: any) {
            this._notifier(err, 'danger')
        }
    }

}

export { Difference }