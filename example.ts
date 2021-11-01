import {TraverseBlockRecursively} from "./types"
// import {traverseBlockRecursively} from "./traverseBlockRecursively"
import { markBlockPublic } from "./findPublicBlocks"


const traverseBlockRecursively: TraverseBlockRecursively = (action, props) => (block) => {
	//
}

traverseBlockRecursively(markBlockPublic, {})

// traverseBlockRecursively<{}, {}, {}>(markBlockPublic, )
