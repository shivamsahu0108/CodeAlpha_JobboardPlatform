from django.contrib.auth.models import User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
import tempfile


class ForgotPasswordTests(TestCase):
	def test_sends_reset_email_for_existing_user(self):
		user = User.objects.create_user(
			username="candidate",
			email="candidate@example.com",
			password="Initial-password-123",
		)

		response = APIClient().post(
			"/api/forgot-password/",
			{"email": user.email},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(mail.outbox), 1)
		self.assertEqual(mail.outbox[0].to, [user.email])
		self.assertIn("/reset-password/?uid=", mail.outbox[0].body)
		self.assertIn("&token=", mail.outbox[0].body)


class JobBoardWorkflowTests(TestCase):
	def test_candidate_and_employer_application_workflow(self):
		public_client = APIClient()
		candidate_registration = public_client.post(
			"/api/register/",
			{
				"username": "workflow-candidate",
				"email": "candidate@example.com",
				"password": "Candidate-password-123",
				"role": "Candidate",
			},
			format="json",
		)
		employer_registration = public_client.post(
			"/api/register/",
			{
				"username": "workflow-employer",
				"email": "employer@example.com",
				"password": "Employer-password-123",
				"role": "Employer",
			},
			format="json",
		)
		self.assertEqual(candidate_registration.status_code, 201)
		self.assertEqual(employer_registration.status_code, 201)

		candidate_login = public_client.post(
			"/api/login/",
			{
				"username": "workflow-candidate",
				"password": "Candidate-password-123",
			},
			format="json",
		)
		employer_login = public_client.post(
			"/api/login/",
			{
				"username": "workflow-employer",
				"password": "Employer-password-123",
			},
			format="json",
		)
		self.assertEqual(candidate_login.status_code, 200)
		self.assertEqual(employer_login.status_code, 200)

		candidate_client = APIClient()
		candidate_client.credentials(
			HTTP_AUTHORIZATION=f"Bearer {candidate_login.data['access']}"
		)
		employer_client = APIClient()
		employer_client.credentials(
			HTTP_AUTHORIZATION=f"Bearer {employer_login.data['access']}"
		)

		job_response = employer_client.post(
			"/api/jobs/create/",
			{
				"title": "Workflow Test Engineer",
				"description": "A role used by the API integration test.",
				"location": "Remote",
				"salary": 80000,
				"job_type": "Full-time",
			},
			format="json",
		)
		self.assertEqual(job_response.status_code, 201)

		with tempfile.TemporaryDirectory() as media_root:
			with override_settings(MEDIA_ROOT=media_root):
				resume_response = candidate_client.post(
					"/api/resumes/upload/",
					{
						"file": SimpleUploadedFile(
							"workflow-resume.pdf",
							b"%PDF-1.4\nTest resume\n%%EOF",
							content_type="application/pdf",
						)
					},
					format="multipart",
				)
				self.assertEqual(resume_response.status_code, 201)

				application_response = candidate_client.post(
					f"/api/jobs/{job_response.data['id']}/apply/",
					{
						"job": job_response.data["id"],
						"resume": resume_response.data["id"],
					},
					format="json",
				)
				self.assertEqual(application_response.status_code, 201)

				applications_response = employer_client.get(
					"/api/employer/applications/"
				)
				self.assertEqual(applications_response.status_code, 200)
				application_id = applications_response.data[0]["id"]

				status_response = employer_client.patch(
					f"/api/applications/{application_id}/status/",
					{"status": "Shortlisted"},
					format="json",
				)
				self.assertEqual(status_response.status_code, 200)

				notifications_response = candidate_client.get(
					"/api/notifications/my/"
				)
				self.assertEqual(notifications_response.status_code, 200)
				self.assertIn("Shortlisted", notifications_response.data[0]["message"])
