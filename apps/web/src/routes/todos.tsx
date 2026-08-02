import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  createTodoMutationFn,
  deleteTodoMutationFn,
  todosQueryOptions,
  toggleTodoMutationFn,
} from "@/utils/api-query";

export const Route = createFileRoute("/todos")({
  component: TodosRoute,
});

type TodoItemProps = {
  completed: boolean;
  id: number;
  onDelete: (id: number) => void;
  onToggle: (id: number, completed: boolean) => void;
  text: string;
};

function TodoItem({ completed, id, onDelete, onToggle, text }: TodoItemProps) {
  const handleDelete = useCallback(() => onDelete(id), [id, onDelete]);
  const handleToggle = useCallback(
    () => onToggle(id, completed),
    [completed, id, onToggle]
  );

  return (
    <li className="flex items-center justify-between rounded-md border p-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={completed}
          id={`todo-${id}`}
          onCheckedChange={handleToggle}
        />
        <label
          className={completed ? "line-through" : ""}
          htmlFor={`todo-${id}`}
        >
          {text}
        </label>
      </div>
      <Button
        aria-label="Delete todo"
        onClick={handleDelete}
        size="icon"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useState("");

  const todos = useQuery(todosQueryOptions());
  const createMutation = useMutation({
    mutationFn: createTodoMutationFn,
    onSuccess: () => {
      void todos.refetch();
      setNewTodoText("");
    },
  });
  const toggleMutation = useMutation({
    mutationFn: toggleTodoMutationFn,
    onSuccess: () => {
      void todos.refetch();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTodoMutationFn,
    onSuccess: () => {
      void todos.refetch();
    },
  });

  const handleAddTodo = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (newTodoText.trim()) {
        createMutation.mutate({ text: newTodoText });
      }
    },
    [createMutation, newTodoText]
  );
  const handleDeleteTodo = useCallback(
    (id: number) => deleteMutation.mutate({ id }),
    [deleteMutation]
  );
  const handleNewTodoTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setNewTodoText(event.target.value),
    []
  );
  const handleToggleTodo = useCallback(
    (id: number, completed: boolean) =>
      toggleMutation.mutate({ completed: !completed, id }),
    [toggleMutation]
  );

  let todoListContent: ReactNode;
  if (todos.isLoading) {
    todoListContent = (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  } else if (todos.data?.length === 0) {
    todoListContent = (
      <p className="py-4 text-center">No todos yet. Add one above!</p>
    );
  } else {
    todoListContent = (
      <ul className="space-y-2">
        {todos.data?.map((todo) => (
          <TodoItem
            completed={todo.completed}
            id={todo.id}
            key={todo.id}
            onDelete={handleDeleteTodo}
            onToggle={handleToggleTodo}
            text={todo.text}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="mb-6 flex items-center space-x-2"
            onSubmit={handleAddTodo}
          >
            <Input
              disabled={createMutation.isPending}
              onChange={handleNewTodoTextChange}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button
              disabled={createMutation.isPending || !newTodoText.trim()}
              type="submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </form>

          {todoListContent}
        </CardContent>
      </Card>
    </div>
  );
}
