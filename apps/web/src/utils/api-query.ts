import { apiClient, unwrapOrThrow } from "./api-client";

export const apiQueryKeys = {
  health: () => ["api", "health"] as const,
  todos: () => ["api", "todos"] as const,
};

export const healthQueryOptions = () => ({
  queryKey: apiQueryKeys.health(),
  queryFn: async () => unwrapOrThrow(await apiClient.api.health.get()),
});

export const todosQueryOptions = () => ({
  queryKey: apiQueryKeys.todos(),
  queryFn: async () => unwrapOrThrow(await apiClient.api.todos.get()),
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
