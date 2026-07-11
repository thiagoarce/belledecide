import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { PageHeader } from "../../components/PageHeader";

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

  if (isLoading || !profile) return <p className="p-6 font-sans text-giz">Carregando perfil…</p>;

  return (
    <div>
      <PageHeader
        eyebrow="Sua família"
        title="Quem a Belle está alimentando"
        subtitle="Ela usa isso pra dimensionar porções e nunca sugerir o que sua família não pode comer."
      />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 px-5 pb-8">
        <div className="card grid grid-cols-2 gap-4 p-4">
          <div>
            <label className="field-label">Pessoas</label>
            <input
              type="number"
              min={1}
              {...register("tamanho", { valueAsNumber: true, min: 1 })}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Crianças</label>
            <input
              type="number"
              min={0}
              {...register("criancas", { valueAsNumber: true, min: 0 })}
              className="field-input"
            />
          </div>
        </div>

        <div className="card p-4">
          <label className="field-label">Alergias</label>
          <p className="mb-1 font-sans text-xs text-giz">Restrição rígida — a Belle nunca inclui.</p>
          <input
            type="text"
            placeholder="amendoim, camarão"
            {...register("alergias")}
            className="field-input"
          />
        </div>

        <div className="card p-4">
          <label className="field-label">Aversões</label>
          <p className="mb-1 font-sans text-xs text-giz">Coisas que a família prefere evitar.</p>
          <input
            type="text"
            placeholder="fígado, quiabo"
            {...register("aversoes")}
            className="field-input"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !formState.isDirty}
          className="btn-decide w-full"
        >
          {mutation.isPending ? "Salvando…" : "Salvar perfil"}
        </button>
        {mutation.isSuccess && (
          <p className="text-center font-sans text-sm text-azulejo-700">Perfil atualizado.</p>
        )}
      </form>
    </div>
  );
}
