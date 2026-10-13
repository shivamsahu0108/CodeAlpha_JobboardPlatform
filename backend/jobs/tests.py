from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient


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
