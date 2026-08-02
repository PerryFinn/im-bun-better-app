import { apiClient, unwrapOrThrow } from "./api-client";

export const apiQueryKeys = {
  health: () => ["api", "health"] as const,
  todos: () => ["api", "todos"] as const,
};

export const healthQueryOptions = () => ({
  queryFn: async () => unwrapOrThrow(await apiClient.api.health.get()),
  queryKey: apiQueryKeys.health(),
});

export const todosQueryOptions = () => ({
  queryFn: async () => unwrapOrThrow(await apiClient.api.todos.get()),
  queryKey: apiQueryKeys.todos(),
});

export const createTodoMutationFn = async (input: { text: string }) =>
  unwrapOrThrow(await apiClient.api.todos.post(input));

export const toggleTodoMutationFn = async (input: {
  id: number;
  completed: boolean;
}) =>
  unwrapOrThrow(
    await apiClient.api.todos({ id: input.id }).patch({
      completed: input.completed,
    })
  );

export const deleteTodoMutationFn = async (input: { id: number }) =>
  unwrapOrThrow(await apiClient.api.todos({ id: input.id }).delete());
