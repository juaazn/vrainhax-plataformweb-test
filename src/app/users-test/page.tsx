"use client";

import { useState, useRef } from "react";
import { useUsers } from "@/lib/hooks/use-users";
import { useCreateUser } from "@/lib/hooks/use-create-user";
import { usersApi, ApiError } from "@/lib/api";
import type { PlatformUserDTO, UserCreatePayload } from "@/types/api";

// ---------------------------------------------------------------------------
// A. Lista de usuarios
// ---------------------------------------------------------------------------

function UserRow({
  user,
  onDeactivated,
}: {
  user: PlatformUserDTO;
  onDeactivated: () => void;
}) {
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  async function handleDeactivate() {
    setDeactivating(true);
    setDeactivateError(null);
    try {
      await usersApi.deactivate(user.userId);
      onDeactivated();
    } catch (err: unknown) {
      setDeactivateError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 font-mono text-sm">{user.username}</td>
      <td className="px-3 py-2 text-sm">{user.email}</td>
      <td className="px-3 py-2 text-sm">{user.role}</td>
      <td className="px-3 py-2 text-sm">
        {user.active ? (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
            activo
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
            inactivo
          </span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-400">
        {user.auth0Sub ?? "—"}
      </td>
      <td className="px-3 py-2">
        {user.active && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deactivating ? "Desactivando..." : "Desactivar"}
            </button>
            {deactivateError && (
              <span className="text-xs text-red-600">{deactivateError}</span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function UserListSection() {
  const { users, isLoading, error, reload } = useUsers();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando usuarios...</p>;
  }

  if (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
          Solo los administradores pueden ver usuarios
        </p>
      );
    }
    return (
      <p className="rounded bg-red-50 p-3 text-sm text-red-700">
        Error al cargar usuarios: {error.message}
      </p>
    );
  }

  if (users.length === 0) {
    return <p className="text-sm text-slate-400">No hay usuarios registrados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Username</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Rol</th>
            <th className="px-3 py-2">Activo</th>
            <th className="px-3 py-2">Auth0Sub</th>
            <th className="px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.userId} user={u} onDeactivated={reload} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// B. Crear usuario
// ---------------------------------------------------------------------------

const emptyForm: UserCreatePayload = {
  username: "",
  email: "",
  roleId: "",
  fullName: "",
  auth0Sub: "",
};

function CreateUserSection() {
  const { createUser, isCreating, error, reset } = useCreateUser();
  const [form, setForm] = useState<UserCreatePayload>(emptyForm);
  const [created, setCreated] = useState<PlatformUserDTO | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreated(null);

    const payload: UserCreatePayload = {
      username: form.username,
      email: form.email,
      roleId: form.roleId,
    };
    if (form.fullName) payload.fullName = form.fullName;
    if (form.auth0Sub) payload.auth0Sub = form.auth0Sub;

    try {
      const user = await createUser(payload);
      setCreated(user);
      setForm(emptyForm);
    } catch {
      // error is already stored in hook state
    }
  }

  function getErrorMessage(err: ApiError): string {
    if (err.status === 400) return `Validacion: ${err.message}`;
    if (err.status === 403) return "Solo los administradores pueden crear usuarios";
    if (err.status === 409) return "Ya existe un usuario con ese email o username";
    return err.message;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            name="username"
            type="text"
            required
            value={form.username}
            onChange={handleChange}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Full Name
          </label>
          <input
            name="fullName"
            type="text"
            value={form.fullName ?? ""}
            onChange={handleChange}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Role ID <span className="text-red-500">*</span>
          </label>
          <input
            name="roleId"
            type="text"
            required
            placeholder="UUID del rol"
            value={form.roleId}
            onChange={handleChange}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Auth0 Sub (opcional)
          </label>
          <input
            name="auth0Sub"
            type="text"
            value={form.auth0Sub ?? ""}
            onChange={handleChange}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isCreating}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isCreating ? "Creando..." : "Crear"}
      </button>

      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          {getErrorMessage(error)}
        </p>
      )}

      {created && (
        <div className="rounded bg-green-50 p-3">
          <p className="mb-1 text-sm font-medium text-green-800">Usuario creado correctamente</p>
          <pre className="overflow-x-auto rounded bg-green-100 p-2 text-xs text-green-900">
            {JSON.stringify(created, null, 2)}
          </pre>
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// C. Buscar por ID
// ---------------------------------------------------------------------------

function FindByIdSection() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<PlatformUserDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = userId.trim();
    if (!id) return;

    setLoading(true);
    setUser(null);
    setError(null);

    try {
      const result = await usersApi.getById(id);
      setUser(result);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Usuario no encontrado");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="User ID (UUID)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-80 rounded border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-blue-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !userId.trim()}
          className="rounded bg-slate-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {user && (
        <pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs text-slate-800">
          {JSON.stringify(user, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function UsersTestPage() {
  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-semibold">Usuarios de Plataforma — Panel de Prueba</h1>

      {/* A. Lista */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">A. Lista de usuarios</h2>
        <UserListSection />
      </section>

      <hr className="border-slate-200" />

      {/* B. Crear */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">B. Crear usuario</h2>
        <CreateUserSection />
      </section>

      <hr className="border-slate-200" />

      {/* C. Buscar por ID */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">C. Buscar por ID</h2>
        <FindByIdSection />
      </section>
    </div>
  );
}
