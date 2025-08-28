import ExperimentalVisualization from '@/components/ExperimentalVisualization'
import { createDefaultPetriNet } from '@/utils/petriNetUtils'
import { useMemo, useState } from 'react'

const defaultNet = createDefaultPetriNet()

const EditorPage = () => {
    const [petriNetVersion] = useState(0) // force refresh when cloning

    const providedNet = useMemo(() => defaultNet, [])

    return (
        <div className='p-4 space-y-4'>
            <ExperimentalVisualization petriNet={providedNet} key={`edit-${petriNetVersion}`} mode='simulator' />
        </div>
    )
}

export default EditorPage