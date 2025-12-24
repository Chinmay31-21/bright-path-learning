-- Allow admins to delete profiles (remove students)
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete student progress
CREATE POLICY "Admins can delete student progress" ON public.student_progress
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete quiz attempts
CREATE POLICY "Admins can delete quiz attempts" ON public.quiz_attempts
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete user roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
