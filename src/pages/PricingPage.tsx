import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Chip, Divider,
  List, ListItem, ListItemIcon, ListItemText, Alert, CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import axios from 'axios';
import { useAppSelector, useAppDispatch } from '../store';
import { updatePlan } from '../store/authSlice';

interface PlanDef {
  id: string;
  name: string;
  price: number;
  interval: string | null;
  userType: string;
  features: string[];
  stripePriceId: string;
  highlighted?: boolean;
}

const PricingPage: React.FC = () => {
  const { token, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    axios.get('/api/payments/plans').then((r) => setPlans(r.data.plans || [])).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription activated! Your plan has been updated.' });
      dispatch(updatePlan('pro'));
    }
    if (params.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Checkout canceled. Your plan was not changed.' });
    }
  }, [dispatch]);

  const relevantPlans = plans.filter((p) => !user || p.userType === user.user_type || p.userType === 'both');

  const handleUpgrade = async (plan: PlanDef) => {
    if (!plan.stripePriceId) return;
    setLoadingPlanId(plan.id);
    try {
      const res = await axios.post('/api/payments/checkout', { planId: plan.id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = res.data.url;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Checkout failed.' });
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handlePortal = async () => {
    try {
      const res = await axios.post('/api/payments/portal', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = res.data.url;
    } catch {
      setMessage({ type: 'error', text: 'Unable to open billing portal.' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1d4479', mb: 1 }}>
          Choose Your Plan
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Flexible plans for candidates and vendors. Upgrade anytime.
        </Typography>
        {user?.plan && user.plan !== 'free' && (
          <Button variant="outlined" size="small" onClick={handlePortal} sx={{ mt: 2 }}>
            Manage Billing
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(auto-fit, minmax(220px, 1fr))' },
        gap: 2.5,
      }}>
        {relevantPlans.map((plan) => {
          const tier = plan.id.includes('enterprise') ? 'enterprise' : plan.id.includes('pro') ? 'pro' : 'free';
          const isCurrent = user?.plan === tier;
          return (
            <Card key={plan.id} elevation={plan.highlighted ? 6 : 2}
              sx={{
                borderRadius: 2,
                border: plan.highlighted ? '2px solid #3b6fa6' : '1px solid #e0e0e0',
                position: 'relative', overflow: 'visible',
              }}
            >
              {plan.highlighted && (
                <Chip label="Most Popular" size="small"
                  icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #3b6fa6, #1d4479)',
                    color: '#fff', fontWeight: 700, fontSize: 11,
                  }}
                />
              )}
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="overline" sx={{ color: '#6a7e90', letterSpacing: 1 }}>
                  {plan.userType === 'candidate' ? 'For Candidates' : 'For Vendors'}
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#1d4479', mt: 0.5 }}>
                  {plan.name}
                </Typography>
                <Box sx={{ my: 1.5 }}>
                  {plan.price === 0
                    ? <Typography variant="h4" fontWeight={700} sx={{ color: '#2e7d32' }}>Free</Typography>
                    : (
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h4" fontWeight={700} sx={{ color: '#1d4479' }}>${plan.price}</Typography>
                        <Typography variant="body2" color="text.secondary">/{plan.interval}</Typography>
                      </Box>
                    )
                  }
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <List dense disablePadding>
                  {plan.features.map((f) => (
                    <ListItem key={f} disablePadding sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <CheckCircleIcon sx={{ fontSize: 15, color: plan.highlighted ? '#3b6fa6' : '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={f}
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2 }}>
                  {isCurrent
                    ? <Chip label="Current Plan" size="small" color="primary" variant="outlined" sx={{ width: '100%', borderRadius: 1 }} />
                    : plan.price === 0
                    ? <Button fullWidth variant="outlined" size="small" disabled>Free Forever</Button>
                    : (
                      <Button fullWidth variant={plan.highlighted ? 'contained' : 'outlined'} size="small"
                        disabled={loadingPlanId === plan.id}
                        onClick={() => handleUpgrade(plan)}
                        sx={plan.highlighted ? {
                          background: 'linear-gradient(135deg, #3b6fa6 0%, #1d4479 100%)',
                          '&:hover': { background: 'linear-gradient(135deg, #4878b8 0%, #2962a8 100%)' },
                        } : {}}
                      >
                        {loadingPlanId === plan.id ? <CircularProgress size={16} /> : 'Upgrade Now'}
                      </Button>
                    )
                  }
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
        All payments processed securely via Stripe. Cancel anytime.
      </Typography>
    </Box>
  );
};

export default PricingPage;
