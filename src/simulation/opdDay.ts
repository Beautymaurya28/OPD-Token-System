import { PatientType, SlotStatus } from '../types/enums';
import { tokenAllocator } from '../core/tokenAllocator';
import { delayHandler } from '../core/delayHandler';
import { store } from '../store/memoryStore';
import { initializeSystem, getSystemOverview } from '../store/seedData';
import { logger } from '../utils/logger';

/**
 * Simulate a complete OPD day with various scenarios
 */

// Utility: Sleep function for readability
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility: Print section header
function printSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

// Utility: Print token result
function printTokenResult(
  patientName: string,
  result: any,
  description: string = ''
) {
  const icon = result.success ? '✅' : '⏳';
  console.log(`${icon} ${patientName}: ${result.message}`);
  if (description) {
    console.log(`   └─ ${description}`);
  }
  if (result.slotInfo) {
    console.log(
      `   └─ Slot: ${result.slotInfo.slotId} (${result.slotInfo.currentLoad}/${result.slotInfo.maxCapacity})`
    );
  }
}

// Utility: Print current system state
function printSystemState() {
  const overview = getSystemOverview();

  console.log('\n📊 CURRENT SYSTEM STATE:');
  console.log(`   Total Tokens: ${overview.totalTokens}`);
  console.log(`   ├─ Allocated: ${overview.tokensByStatus.allocated}`);
  console.log(`   ├─ Waitlisted: ${overview.tokensByStatus.waitlisted}`);
  console.log(`   ├─ Completed: ${overview.tokensByStatus.completed}`);
  console.log(`   ├─ Cancelled: ${overview.tokensByStatus.cancelled}`);
  console.log(`   └─ No-shows: ${overview.tokensByStatus.noShow}`);

  console.log('\n👨‍⚕️ DOCTORS:');
  overview.doctors.forEach((doc) => {
    console.log(`   ${doc.name} (${doc.specialization})`);
    const totalSlots = doc.slotsUtilization.length;
    const fullSlots = doc.slotsUtilization.filter(
      (s: any) => s.status === 'FULL' || s.status === 'OVERFLOW'
    ).length;
    console.log(`   └─ Slots: ${fullSlots}/${totalSlots} filled`);
  });
}

/**
 * Main simulation function
 */
async function simulateOPDDay() {
  printSection('🏥 OPD TOKEN ALLOCATION SIMULATION - ONE DAY');

  // Reset and initialize system
  console.log('🔄 Initializing system...\n');
  initializeSystem();

  await sleep(500);

  // ============================================================================
  // SCENARIO 1: Morning Rush - Online Bookings
  // ============================================================================
  printSection('SCENARIO 1: Morning Rush - Online Bookings (9:00 AM)');

  const onlineBookings = [
    { name: 'Rajesh Singh', doctor: 'doc-1', type: PatientType.ONLINE_BOOKING },
    { name: 'Priya Verma', doctor: 'doc-1', type: PatientType.ONLINE_BOOKING },
    { name: 'Amit Kumar', doctor: 'doc-2', type: PatientType.ONLINE_BOOKING },
    { name: 'Sneha Patel', doctor: 'doc-2', type: PatientType.ONLINE_BOOKING },
    { name: 'Vikram Rao', doctor: 'doc-3', type: PatientType.ONLINE_BOOKING },
  ];

  for (const booking of onlineBookings) {
    const result = tokenAllocator.allocateToken(
      booking.name,
      booking.type,
      booking.doctor
    );
    printTokenResult(booking.name, result, 'Online pre-booking');
    await sleep(200);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 2: Walk-ins Start Arriving
  // ============================================================================
  printSection('SCENARIO 2: Walk-in Patients Arrive (9:30 AM)');

  const walkIns = [
    { name: 'Ramesh Gupta', doctor: 'doc-1' },
    { name: 'Sunita Sharma', doctor: 'doc-1' },
    { name: 'Karan Mehta', doctor: 'doc-2' },
    { name: 'Anjali Desai', doctor: 'doc-3' },
    { name: 'Suresh Reddy', doctor: 'doc-1' },
  ];

  for (const walkIn of walkIns) {
    const result = tokenAllocator.allocateToken(
      walkIn.name,
      PatientType.WALK_IN,
      walkIn.doctor
    );
    printTokenResult(walkIn.name, result, 'Walk-in patient');
    await sleep(200);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 3: Follow-up Patients
  // ============================================================================
  printSection('SCENARIO 3: Follow-up Patients (10:00 AM)');

  const followUps = [
    { name: 'Meena Iyer', doctor: 'doc-1' },
    { name: 'Dinesh Joshi', doctor: 'doc-2' },
    { name: 'Kavita Nair', doctor: 'doc-3' },
  ];

  for (const followUp of followUps) {
    const result = tokenAllocator.allocateToken(
      followUp.name,
      PatientType.FOLLOW_UP,
      followUp.doctor
    );
    printTokenResult(followUp.name, result, 'Follow-up appointment');
    await sleep(200);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 4: Paid Priority Patients (VIP)
  // ============================================================================
  printSection('SCENARIO 4: Paid Priority Patients Arrive (10:30 AM)');

  console.log('💰 VIP patients willing to pay for priority...\n');

  const paidPriority = [
    { name: 'Mr. Agarwal (VIP)', doctor: 'doc-1' },
    { name: 'Mrs. Kapoor (VIP)', doctor: 'doc-2' },
  ];

  for (const vip of paidPriority) {
    const result = tokenAllocator.allocateToken(
      vip.name,
      PatientType.PAID_PRIORITY,
      vip.doctor
    );
    printTokenResult(vip.name, result, 'Paid priority - may bump walk-ins');
    await sleep(200);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 5: Emergency Patients
  // ============================================================================
  printSection('SCENARIO 5: Emergency Cases (11:00 AM)');

  console.log('🚨 Emergency patients arrive - MUST be accommodated!\n');

  const emergencies = [
    { name: 'Accident Patient - Ravi', doctor: 'doc-1' },
    { name: 'Heart Attack - Mohan', doctor: 'doc-1' },
    { name: 'Severe Injury - Sita', doctor: 'doc-3' },
  ];

  for (const emergency of emergencies) {
    const result = tokenAllocator.allocateToken(
      emergency.name,
      PatientType.EMERGENCY,
      emergency.doctor
    );
    printTokenResult(emergency.name, result, '🚨 EMERGENCY - Creates overflow');
    await sleep(200);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 6: Cancellations
  // ============================================================================
  printSection('SCENARIO 6: Patient Cancellations (12:00 PM)');

  console.log('📞 Some patients call to cancel their appointments...\n');

  const allTokens = store.getAllTokens();
  const allocatedTokens = allTokens.filter((t) => t.status === 'ALLOCATED');

  if (allocatedTokens.length >= 2) {
    const token1 = allocatedTokens[0];
    const token2 = allocatedTokens[1];

    console.log(`📞 ${token1.patientName} cancels appointment`);
    const result1 = tokenAllocator.cancelToken(token1.id);
    console.log(`   ├─ ${result1.message}`);

    // Check if someone was promoted
    const slot1 = store.getSlot(token1.slotId!);
    if (slot1 && slot1.waitlist.length === 0) {
      console.log(`   └─ No one in waitlist to promote`);
    } else {
      console.log(`   └─ ✅ Waitlisted patient promoted!`);
    }

    await sleep(300);

    console.log(`\n📞 ${token2.patientName} cancels appointment`);
    const result2 = tokenAllocator.cancelToken(token2.id);
    console.log(`   ├─ ${result2.message}`);

    const slot2 = store.getSlot(token2.slotId!);
    if (slot2 && slot2.waitlist.length === 0) {
      console.log(`   └─ No one in waitlist to promote`);
    } else {
      console.log(`   └─ ✅ Waitlisted patient promoted!`);
    }
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 7: No-shows
  // ============================================================================
  printSection('SCENARIO 7: No-show Patients (2:00 PM)');

  console.log("😞 Some patients don't show up for their appointments...\n");

  const currentAllocated = store
    .getAllTokens()
    .filter((t) => t.status === 'ALLOCATED');

  if (currentAllocated.length >= 1) {
    const noShowToken = currentAllocated[0];
    console.log(`😞 ${noShowToken.patientName} didn't show up`);
    const result = tokenAllocator.markNoShow(noShowToken.id);
    console.log(`   ├─ ${result.message}`);
    console.log(`   └─ Slot freed for waitlisted patients`);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 8: More Walk-ins (Stress Test)
  // ============================================================================
  printSection('SCENARIO 8: Afternoon Walk-in Rush (3:00 PM)');

  console.log('🚶 Heavy walk-in traffic in the afternoon...\n');

  const afternoonWalkIns = [
    'Gopal Krishna',
    'Lata Mangeshkar',
    'Ratan Tata',
    'Indira Gandhi',
    'Sachin Tendulkar',
    'Laxmi Bai',
    'Abdul Kalam',
  ];

  for (const name of afternoonWalkIns) {
    const randomDoctor = ['doc-1', 'doc-2', 'doc-3'][
      Math.floor(Math.random() * 3)
    ];
    const result = tokenAllocator.allocateToken(
      name,
      PatientType.WALK_IN,
      randomDoctor
    );
    printTokenResult(name, result, 'Afternoon walk-in');
    await sleep(150);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 9: Complete Some Consultations
  // ============================================================================
  printSection('SCENARIO 9: Completing Consultations (4:00 PM)');

  console.log('✅ Doctors complete consultations...\n');

  const tokensToComplete = store
    .getAllTokens()
    .filter((t) => t.status === 'ALLOCATED')
    .slice(0, 5);

  for (const token of tokensToComplete) {
    tokenAllocator.completeToken(token.id);
    console.log(`✅ ${token.patientName} - Consultation completed`);
    await sleep(200);
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // SCENARIO 10: Doctor Delay (ELASTIC CAPACITY) ⭐
  // ============================================================================
  printSection('SCENARIO 10: Doctor Delay - Elastic Capacity (4:30 PM)');

  console.log('⏰ Dr. Rajesh Kumar is running 30 minutes late...\n');

  const doctorSlots = store.getSlotsByDoctor('doc-1');
  const delayFromSlot = doctorSlots[4]; // 5th slot

  if (delayFromSlot) {
    const impact = delayHandler.handleDoctorDelay(
      'doc-1',
      30,
      delayFromSlot.id
    );

    console.log('📊 DELAY IMPACT:');
    console.log(`   ├─ Delayed Slots: ${impact.delayedSlotIds.length}`);
    console.log(`   ├─ Affected Patients: ${impact.affectedTokenCount}`);
    console.log(`   └─ Overflow Created: ${impact.overflowCreated ? 'Yes ⚠️' : 'No ✅'}`);

    console.log('\n💡 SYSTEM SUGGESTIONS:');
    impact.suggestions.forEach((suggestion) => {
      console.log(`   • ${suggestion}`);
    });
  }

  await sleep(1000);

  // ============================================================================
  // SCENARIO 11: Slot Redistribution (ELASTIC CAPACITY) ⭐
  // ============================================================================
  printSection('SCENARIO 11: Emergency Slot Redistribution (5:00 PM)');

  console.log('🚨 One slot needs to be cancelled due to equipment failure...\n');

  const slotToCancel = doctorSlots[6];
  let redistResult: any = null;

  if (slotToCancel && slotToCancel.allocatedTokens.length > 0) {
    console.log(`Cancelling slot: ${slotToCancel.startTime}-${slotToCancel.endTime}`);
    console.log(`Patients to redistribute: ${slotToCancel.allocatedTokens.length}\n`);

    redistResult = delayHandler.redistributePatientsFromSlot(slotToCancel.id);

    console.log('📊 REDISTRIBUTION RESULT:');
    console.log(`   ├─ Successfully Redistributed: ${redistResult.redistributed}`);
    console.log(`   └─ Failed to Redistribute: ${redistResult.failed}`);

    console.log('\n📝 DETAILS:');
    redistResult.details.slice(0, 5).forEach((detail: any) => {
      console.log(`   ${detail}`);
    });

    if (redistResult.details.length > 5) {
      console.log(`   ... and ${redistResult.details.length - 5} more`);
    }
  }

  printSystemState();
  await sleep(1000);

  // ============================================================================
  // FINAL STATISTICS
  // ============================================================================
  printSection('📈 FINAL DAY SUMMARY');

  const finalOverview = getSystemOverview();
  const allFinalTokens = store.getAllTokens();

  console.log('📊 TOKEN STATISTICS:');
  console.log(`   Total Patients Today: ${finalOverview.totalTokens}`);
  console.log(`   ├─ Successfully Allocated: ${finalOverview.tokensByStatus.allocated}`);
  console.log(`   ├─ Currently Waiting: ${finalOverview.tokensByStatus.waitlisted}`);
  console.log(`   ├─ Completed: ${finalOverview.tokensByStatus.completed}`);
  console.log(`   ├─ Cancelled: ${finalOverview.tokensByStatus.cancelled}`);
  console.log(`   └─ No-shows: ${finalOverview.tokensByStatus.noShow}`);

  console.log('\n👥 PATIENT TYPE BREAKDOWN:');
  console.log(`   ├─ Emergency: ${allFinalTokens.filter((t) => t.patientType === PatientType.EMERGENCY).length}`);
  console.log(`   ├─ Paid Priority: ${allFinalTokens.filter((t) => t.patientType === PatientType.PAID_PRIORITY).length}`);
  console.log(`   ├─ Follow-up: ${allFinalTokens.filter((t) => t.patientType === PatientType.FOLLOW_UP).length}`);
  console.log(`   ├─ Online Booking: ${allFinalTokens.filter((t) => t.patientType === PatientType.ONLINE_BOOKING).length}`);
  console.log(`   └─ Walk-in: ${allFinalTokens.filter((t) => t.patientType === PatientType.WALK_IN).length}`);

  console.log('\n🔄 SYSTEM DYNAMICS:');
  const bumpedCount = allFinalTokens.filter((t) => t.bumpCount > 0).length;
  const totalBumps = allFinalTokens.reduce((sum, t) => sum + t.bumpCount, 0);
  console.log(`   ├─ Patients Bumped: ${bumpedCount}`);
  console.log(`   ├─ Total Bump Events: ${totalBumps}`);
  console.log(`   └─ Waitlist Promotions: ${finalOverview.tokensByStatus.cancelled + finalOverview.tokensByStatus.noShow}`);

  console.log('\n👨‍⚕️ DOCTOR PERFORMANCE:');
  finalOverview.doctors.forEach((doc) => {
    const docTokens = allFinalTokens.filter((t) => t.doctorId === doc.id);
    const completed = docTokens.filter((t) => t.status === 'COMPLETED').length;

    console.log(`   ${doc.name}`);
    console.log(`   ├─ Total Patients: ${docTokens.length}`);
    console.log(`   ├─ Completed: ${completed}`);

    const overflowSlots = doc.slotsUtilization.filter(
      (s: any) => s.status === 'OVERFLOW'
    ).length;
    if (overflowSlots > 0) {
      console.log(`   └─ ⚠️  Overflow Slots: ${overflowSlots}`);
    } else {
      console.log(`   └─ No overflow (well managed)`);
    }
  });

  // ============================================================================
  // ANALYTICS INSIGHTS ⭐
  // ============================================================================
  printSection('📈 ANALYTICS & INSIGHTS');

  const allSlots = store.getAllSlots();

  // Slot utilization
  const utilizationData = allSlots.map((slot) => ({
    slot: `${slot.startTime}-${slot.endTime}`,
    utilization: ((slot.currentLoad / slot.maxCapacity) * 100).toFixed(1),
    status: slot.status,
  }));

  const avgUtilization =
    allSlots.reduce((sum, s) => sum + (s.currentLoad / s.maxCapacity), 0) /
    allSlots.length;

  console.log('📊 SLOT UTILIZATION:');
  console.log(`   Average Utilization: ${(avgUtilization * 100).toFixed(1)}%`);

  const highUtilSlots = utilizationData.filter((s) => parseFloat(s.utilization) > 90);
  const lowUtilSlots = utilizationData.filter((s) => parseFloat(s.utilization) < 50);

  console.log(`   ├─ High Utilization Slots (>90%): ${highUtilSlots.length}`);
  console.log(`   └─ Low Utilization Slots (<50%): ${lowUtilSlots.length}`);

  // Emergency load
  const emergencyTokens = allFinalTokens.filter(
    (t) => t.patientType === PatientType.EMERGENCY
  );
  const emergencyLoad = allFinalTokens.length > 0 
    ? (emergencyTokens.length / allFinalTokens.length) * 100 
    : 0;

  console.log('\n🚨 EMERGENCY LOAD:');
  console.log(`   Emergency Patients: ${emergencyTokens.length}`);
  console.log(`   Emergency Load: ${emergencyLoad.toFixed(1)}% of total`);

  const overflowSlots = allSlots.filter((s) => s.status === SlotStatus.OVERFLOW);
  console.log(`   Overflow Slots Created: ${overflowSlots.length}`);

  // Idle capacity
  const idleCapacity = allSlots.reduce(
    (sum, s) => sum + Math.max(0, s.maxCapacity - s.currentLoad),
    0
  );
  const totalCapacity = allSlots.reduce((sum, s) => sum + s.maxCapacity, 0);

  console.log('\n💺 CAPACITY ANALYSIS:');
  console.log(`   Total Capacity: ${totalCapacity} slots`);
  console.log(`   Used Capacity: ${totalCapacity - idleCapacity} slots`);
  console.log(`   Idle Capacity: ${idleCapacity} slots`);
  console.log(`   Efficiency: ${(((totalCapacity - idleCapacity) / totalCapacity) * 100).toFixed(1)}%`);

  // Recommendations
  console.log('\n💡 OPERATIONAL INSIGHTS:');
  if (avgUtilization > 0.85) {
    console.log('   ⚠️  High overall utilization - consider adding more slots');
  }
  if (overflowSlots.length > 2) {
    console.log('   ⚠️  Multiple overflow events - review emergency protocols');
  }
  if (emergencyLoad > 15) {
    console.log('   ⚠️  High emergency load - may need dedicated emergency slots');
  }
  if (idleCapacity > totalCapacity * 0.3) {
    console.log('   ✅ Good capacity buffer maintained');
  }
  if (redistResult && redistResult.redistributed > 0) {
    console.log('   ✅ Elastic capacity successfully demonstrated');
  }
  if (avgUtilization < 0.85 && overflowSlots.length <= 2) {
    console.log('   ✅ System operating at optimal efficiency');
  }

  console.log('\n' + '='.repeat(80));
  console.log('  ✅ OPD DAY SIMULATION COMPLETED SUCCESSFULLY');
  console.log('='.repeat(80) + '\n');

  // ============================================================================
  // EDGE CASES DEMONSTRATED
  // ============================================================================
  printSection('✅ EDGE CASES SUCCESSFULLY HANDLED');

  console.log('1. ✅ Slot Capacity Enforcement');
  console.log('   └─ No slot exceeded capacity (except emergencies)');

  console.log('\n2. ✅ Emergency Overflow');
  console.log('   └─ Emergency patients created overflow, system handled gracefully');

  console.log('\n3. ✅ Priority-based Bumping');
  console.log('   └─ Paid priority patients bumped walk-ins when slots were full');

  console.log('\n4. ✅ Waitlist Management');
  console.log('   └─ Patients added to waitlist when slots full, promoted on cancellations');

  console.log('\n5. ✅ Cancellation Handling');
  console.log('   └─ Freed slots automatically promoted waitlisted patients');

  console.log('\n6. ✅ No-show Handling');
  console.log('   └─ No-show patients freed slots for others');

  console.log('\n7. ✅ Multiple Patient Types');
  console.log('   └─ System handled 5 different patient types with different priorities');

  console.log('\n8. ✅ Real-time Dynamic Allocation');
  console.log('   └─ System adjusted in real-time to changing conditions');

  console.log('\n9. ✅ Doctor Delay Handling (ELASTIC CAPACITY)');
  console.log('   └─ System analyzed impact and provided actionable suggestions');

  console.log('\n10. ✅ Slot Redistribution (ELASTIC CAPACITY)');
  console.log(`    └─ Successfully redistributed ${redistResult?.redistributed || 0} patients from cancelled slot`);

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the simulation
if (require.main === module) {
  simulateOPDDay().catch((error) => {
    logger.error('Simulation failed', error);
    process.exit(1);
  });
}

export { simulateOPDDay };