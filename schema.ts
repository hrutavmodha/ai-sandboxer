interface Task {
    id: number,
    description: string,
    details: Array<string>,
    completed: boolean
}

interface Phase {
    id: number,
    description: string,
    tasks: Array<Task>
}

interface Project {
    name: string,
    description: string,
    techStacks: Array<string>,
    roadmap: Array<Phase>
}

interface Bug {
    id: number,
    description: string,
    details: Array<string>,
    suggestedSolution: string, 
    fixed: boolean
}

type Bugs = Array<Bug>