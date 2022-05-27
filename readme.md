# Threebox 오브젝트 에디팅 툴
![ezgif-3-e0aef453c6](https://user-images.githubusercontent.com/44242823/170648636-e3444c24-4683-44e2-be42-459244244964.gif)

## 적용 예시
    import {~~~} from '~~~'
    const useEditor = (tb) => {
        useEffect(() => {
            if (!tb) return
            tb.editor = new Editor()
            tb.editor.setSaveLoadFn(
                async () => {
                    return await getContent('models')
                },
                async (data) => {
                    const res = await uploadContent('models', data)
                    if (res) return res
                }
            )
            tb.editor.setNotifier((msg, type) => {
                activateSnackbar(msg, (["info", "warning", "danger"].includes(type)) ? type : undefined)
            })
            tb.editor.setEnabledStatus(true)
        }, [tb])

        return
    }


