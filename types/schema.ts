export interface Task {
    id: number,
    description: string,
    details: Array<string>,
    tests: Array<string>,
    completed: boolean
}

export interface Phase {
    id: number,
    description: string,
    tasks: Array<Task>,
    tests: Array<string>
}

export interface Project {
    name: string,
    description: string,
    techStacks: Array<string>,
    roadmap: Array<Phase>
}

export interface Bug {
    id: number,
    description: string,
    details: Array<string>,
    suggestedSolution: string, 
    fixed: boolean
}

export type Bugs = Array<Bug>
