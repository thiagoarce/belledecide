import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

interface FamilyProfileRow {
  family_id: string;
  tamanho: number;
  criancas: number;
  alergias: string[];
  aversoes: string[];
}

interface FormValues {
  tamanho: number;
  criancas: number;
  alergias: string;
  aversoes: string;
}

async function fetchProfile(): Promise<FamilyProfileRow> {
  const { data, error } = await supabase.from("family_profile").select("*").single();
  if (error) throw error;
  return data;
}

async function saveProfile(familyId: string, values: FormValues) {
  const { error } = await supabase
    .from("family_profile")
    .update({
      tamanho: values.tamanho,
      criancas: values.criancas,
      alergias: splitList(values.alergias),
      aversoes: splitList(values.aversoes),
    })
    .eq("family_id", familyId);
  if (error) throw error;
}

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function FamilyProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["family_profile"], queryFn: fetchProfile });

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: { tamanho: 1, criancas: 0, alergias: "", aversoes: "" },
  });

  useEffect(() => {
    if (profile) {
      reset({
        tamanho: profile.tamanho,
        criancas: profile.criancas,
        alergias: profile.alergias.join(", "),
        aversoes: profile.aversoes.join(", "),
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => saveProfile(profile!.family_id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family_profile"] }),
  });

  if (isLoading || !profile) return <p className="p-6 text-stone-500">Carregando perfil…</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-stone-900">Perfil da família</h1>
      <p className="mb-6 text-sm text-stone-500">
        A IA usa esses dados para dimensionar porções e nunca sugerir algo que sua família não pode comer.
      </p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">Número de pessoas</label>
          <input
            type="number"
            min={1}
            {...register("tamanho", { valueAsNumber: true, min: 1 })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Número de crianças</label>
          <input
            type="number"
            min={0}
            {...register("criancas", { valueAsNumber: true, min: 0 })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Alergias (separadas por vírgula)</label>
          <input
            type="text"
            placeholder="amendoim, camarão"
            {...register("alergias")}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Aversões (separadas por vírgula)</label>
          <input
            type="text"
            placeholder="fígado, quiabo"
            {...register("aversoes")}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !formState.isDirty}
          className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {mutation.isPending ? "Salvando…" : "Salvar perfil"}
        </button>
        {mutation.isSuccess && <p className="text-sm text-green-700">Perfil atualizado.</p>}
      </form>
    </div>
  );
}
