'use server';

import { deleteStudentById } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteStudent(formData: FormData) {
  let id = Number(formData.get('id'));
  await deleteStudentById(id);
  console.log('Suppression de l\'étudiant avec l\'ID:', id);
  revalidatePath('/');
}
