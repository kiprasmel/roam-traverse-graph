import { Block } from "../roam.d";

export function blockStringHasCode<M0, M1>(block?: Block<M0, M1>) {
	return !!block?.string?.includes?.("```");
}
